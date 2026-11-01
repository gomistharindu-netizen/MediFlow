<?php

namespace Tests\Feature;

use App\Models\ClinicSetting;
use App\Models\Doctor;
use App\Models\DoctorSession;
use App\Models\Invoice;
use App\Models\Medicine;
use App\Models\MedicineBatch;
use App\Models\Patient;
use App\Models\Payment;
use App\Models\Prescription;
use App\Models\PrescriptionItem;
use App\Models\SmsLog;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Visit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HardwareSmsAndPilotSimulationTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        // Ensure central database is migrated
        $this->artisan('migrate');
    }

    /**
     * Test SMS dispatch and thermal ESC/POS slip generation.
     */
    public function test_sms_dispatch_and_thermal_esc_pos_printing(): void
    {
        $tenant = Tenant::firstOrCreate(
            ['id' => 'arogya'],
            ['data' => ['name' => 'Arogya Medical Centre']]
        );

        $visitId = null;
        $paymentId = null;
        $token = null;

        $tenant->run(function () use (&$visitId, &$paymentId, &$token) {
            ClinicSetting::set('sms_enabled', true);
            ClinicSetting::set('sms_gateway_provider', 'mock');
            ClinicSetting::set('sms_sender_mask', 'MEDIFLOW');
            ClinicSetting::set('thermal_printer_width', '80mm');

            $user = User::firstOrCreate(
                ['email' => 'admin@arogya.test'],
                ['name' => 'Admin User', 'password' => bcrypt('password')]
            );
            $token = $user->createToken('test-token')->plainTextToken;

            $docUser = User::firstOrCreate(
                ['email' => 'dr.hardware@arogya.test'],
                ['name' => 'Dr. Kamal Perera', 'password' => bcrypt('password')]
            );
            $doctor = Doctor::firstOrCreate(
                ['user_id' => $docUser->id],
                ['specialization' => 'General Medicine', 'room_number' => 'Room 2', 'consultation_fee' => 1500.00]
            );

            $patient = Patient::firstOrCreate(
                ['phone' => '0779988111'],
                [
                    'patient_id' => 'MF-2026-99001',
                    'first_name' => 'Kasun',
                    'last_name' => 'Chamara',
                    'date_of_birth' => '1996-05-15',
                    'gender' => 'male',
                ]
            );

            $bookingRef = 'APT-SMS-' . rand(10000, 99999);
            $invNum = 'INV-2026-' . rand(10000, 99999);
            $receiptNum = 'RCP-2026-' . rand(10000, 99999);

            $visit = Visit::create([
                'patient_id' => $patient->id,
                'doctor_id' => $doctor->id,
                'token_number' => 12,
                'status' => 'WAITING',
                'visit_date' => now()->toDateString(),
                'booking_reference' => $bookingRef,
            ]);
            $visitId = $visit->id;

            $invoice = Invoice::create([
                'invoice_number' => $invNum,
                'visit_id' => $visit->id,
                'patient_id' => $patient->id,
                'consultation_fee' => 1500.00,
                'pharmacy_fee' => 0.00,
                'total_amount' => 1500.00,
                'paid_amount' => 1500.00,
                'balance_due' => 0.00,
                'status' => 'PAID',
            ]);

            $payment = Payment::create([
                'invoice_id' => $invoice->id,
                'receipt_number' => $receiptNum,
                'amount' => 1500.00,
                'payment_method' => 'CASH',
                'charge_type' => 'FULL_SETTLEMENT',
                'cashier_id' => $user->id,
            ]);
            $paymentId = $payment->id;
        });

        $headers = [
            'X-Tenant' => 'arogya',
            'Authorization' => "Bearer {$token}",
        ];

        // 1. Test Doctor Calling SMS Trigger
        $callRes = $this->withHeaders($headers)->postJson('/api/queue/call', [
            'visit_id' => $visitId,
        ]);
        $callRes->assertStatus(200);

        // Verify SMS log was created in Arogya tenant DB
        $tenant->run(function () use ($visitId) {
            $sms = SmsLog::where('visit_id', $visitId)->latest()->first();
            $this->assertNotNull($sms);
            $this->assertEquals('94779988111', $sms->recipient_phone);
            $this->assertEquals('DOCTOR_CALLED', $sms->message_type);
            $this->assertEquals('MOCKED', $sms->status);
            $this->assertStringContainsString('Token #12', $sms->message_body);
        });

        // 2. Test Thermal Token Slip Endpoint (80mm & 58mm)
        $tokenSlipRes = $this->withHeaders($headers)->getJson("/api/thermal/token/{$visitId}?width=80mm");
        $tokenSlipRes->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => ['width', 'plain_text', 'esc_pos_hex'],
            ]);
        $this->assertStringContainsString('#12', $tokenSlipRes->json('data.plain_text'));
        $this->assertStringContainsString('Kasun Chamara', $tokenSlipRes->json('data.plain_text'));

        // 3. Test Thermal Payment Receipt Endpoint
        $receiptSlipRes = $this->withHeaders($headers)->getJson("/api/thermal/receipt/{$paymentId}?width=80mm");
        $receiptSlipRes->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => ['width', 'plain_text', 'esc_pos_hex'],
            ]);
        $this->assertStringContainsString('RCP-2026-', $receiptSlipRes->json('data.plain_text'));
        $this->assertStringContainsString('1,500.00', $receiptSlipRes->json('data.plain_text'));

        // 4. Test SMS Logs List API
        $logsRes = $this->withHeaders($headers)->getJson('/api/sms/logs');
        $logsRes->assertStatus(200)
            ->assertJson(['success' => true]);
        $this->assertNotEmpty($logsRes->json('data'));
    }

    /**
     * Test full pilot simulation comparing two clinics with opposite operational models:
     * Clinic A (Arogya): Pay-AFTER, In-house Pharmacy ENABLED, 80mm Printer.
     * Clinic B (Suwa Piyasa): Pay-BEFORE, In-house Pharmacy DISABLED, 58mm Printer.
     */
    public function test_multi_tenant_dual_clinic_pilot_simulation(): void
    {
        $tenantA = Tenant::firstOrCreate(
            ['id' => 'arogya'],
            ['data' => ['name' => 'Arogya Medical Centre']]
        );

        $tenantB = Tenant::firstOrCreate(
            ['id' => 'suwapiyasa'],
            ['data' => ['name' => 'Suwa Piyasa Family Clinic']]
        );

        // Configure Clinic A (Arogya)
        $tenantA->run(function () {
            ClinicSetting::set('consultation_payment_timing', 'AFTER');
            ClinicSetting::set('pharmacy_enabled', true);
            ClinicSetting::set('thermal_printer_width', '80mm');
            ClinicSetting::set('queue_late_arrival_policy', 'FAIR_16_24');

            // Seed inventory
            $med = Medicine::firstOrCreate(
                ['name' => 'Amoxicillin 500mg'],
                ['generic_name' => 'Amoxicillin', 'dosage_form' => 'CAPSULE', 'strength' => '500mg', 'unit' => 'Capsules', 'reorder_level' => 50, 'is_penicillin' => true]
            );
            MedicineBatch::create([
                'medicine_id' => $med->id,
                'batch_number' => 'AMX-AROGYA-01',
                'expiry_date' => now()->addMonths(6)->toDateString(),
                'quantity_received' => 100,
                'quantity_available' => 100,
                'unit_cost' => 15.00,
                'selling_unit_price' => 25.00,
            ]);
        });

        // Configure Clinic B (Suwa Piyasa)
        $tenantB->run(function () {
            ClinicSetting::set('consultation_payment_timing', 'BEFORE');
            ClinicSetting::set('pharmacy_enabled', false); // EXTERNAL PHARMACY
            ClinicSetting::set('thermal_printer_width', '58mm');
            ClinicSetting::set('queue_late_arrival_policy', 'END_OF_QUEUE');
        });

        // Verify Isolated Tenant Settings
        $tenantA->run(function () {
            $this->assertEquals('AFTER', ClinicSetting::get('consultation_payment_timing'));
            $this->assertTrue(ClinicSetting::get('pharmacy_enabled'));
            $this->assertEquals('80mm', ClinicSetting::get('thermal_printer_width'));
            $this->assertGreaterThan(0, MedicineBatch::where('batch_number', 'AMX-AROGYA-01')->count());
        });

        $tenantB->run(function () {
            $this->assertEquals('BEFORE', ClinicSetting::get('consultation_payment_timing'));
            $this->assertFalse(ClinicSetting::get('pharmacy_enabled'));
            $this->assertEquals('58mm', ClinicSetting::get('thermal_printer_width'));
            // Physical DB Isolation: Arogya batch MUST NOT exist in Suwa Piyasa DB!
            $this->assertEquals(0, MedicineBatch::where('batch_number', 'AMX-AROGYA-01')->count());
        });
    }
}
