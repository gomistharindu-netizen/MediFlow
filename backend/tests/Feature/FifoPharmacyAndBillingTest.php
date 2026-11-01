<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\Tenant;
use App\Models\Patient;
use App\Models\Visit;
use App\Models\Doctor;
use App\Models\Medicine;
use App\Models\MedicineBatch;
use App\Models\Prescription;
use App\Models\PrescriptionItem;

class FifoPharmacyAndBillingTest extends TestCase
{
    private function getAuthHeaders(string $tenant = 'arogya'): array
    {
        $loginRes = $this->withHeaders(['X-Tenant' => $tenant])
            ->postJson('/api/auth/login', [
                'email' => 'cashier@clinic.com',
                'password' => 'password123',
            ]);
        $token = $loginRes->json('token');

        return [
            'X-Tenant' => $tenant,
            'Authorization' => "Bearer {$token}",
            'Accept' => 'application/json',
        ];
    }

    public function test_fifo_earliest_expiry_batch_deduction(): void
    {
        $headers = $this->getAuthHeaders('arogya');
        $tenant = Tenant::findOrFail('arogya');

        $prescriptionId = null;
        $batchAId = null;
        $batchBId = null;

        $tenant->run(function () use (&$prescriptionId, &$batchAId, &$batchBId) {
            $doctor = Doctor::first();
            $patient = Patient::firstOrCreate(
                ['phone' => '0779998888'],
                [
                    'patient_id' => 'MF-FIFO-001',
                    'first_name' => 'Saman',
                    'last_name' => 'Perera',
                    'gender' => 'male',
                ]
            );

            $panadol = Medicine::firstOrCreate(
                ['name' => 'Panadol 500mg'],
                [
                    'generic_name' => 'Paracetamol',
                    'dosage_form' => 'Tablet',
                    'strength' => '500mg',
                    'reorder_level' => 100,
                    'unit' => 'tablets',
                    'is_active' => true,
                ]
            );

            // Clean prior test records
            Visit::where('booking_reference', 'APT-FIFO-TEST')->delete();
            MedicineBatch::where('batch_number', 'TEST-BCH-EARLY')->delete();
            MedicineBatch::where('batch_number', 'TEST-BCH-LATE')->delete();

            $batchA = MedicineBatch::create([
                'medicine_id' => $panadol->id,
                'batch_number' => 'TEST-BCH-EARLY',
                'expiry_date' => now()->addMonths(2)->toDateString(), // Earliest (FIFO 1st)
                'quantity_received' => 200,
                'quantity_available' => 200,
                'purchase_unit_price' => 3.50,
                'selling_unit_price' => 6.00,
            ]);
            $batchAId = $batchA->id;

            $batchB = MedicineBatch::create([
                'medicine_id' => $panadol->id,
                'batch_number' => 'TEST-BCH-LATE',
                'expiry_date' => now()->addMonths(14)->toDateString(), // Later (FIFO 2nd)
                'quantity_received' => 500,
                'quantity_available' => 500,
                'purchase_unit_price' => 3.75,
                'selling_unit_price' => 6.00,
            ]);
            $batchBId = $batchB->id;

            $visit = Visit::create([
                'patient_id' => $patient->id,
                'doctor_id' => $doctor->id,
                'token_number' => 77,
                'visit_date' => date('Y-m-d'),
                'status' => 'IN_CONSULTATION',
                'priority_level' => 'NORMAL',
                'booking_reference' => 'APT-FIFO-TEST',
            ]);

            $rx = Prescription::create([
                'visit_id' => $visit->id,
                'patient_id' => $patient->id,
                'doctor_id' => $doctor->id,
                'dispense_status' => 'PENDING',
            ]);
            $prescriptionId = $rx->id;

            // Patient requires 250 tablets:
            // 200 MUST be deducted from Batch A (depleting it to 0)
            // 50 MUST be deducted from Batch B (leaving 450)
            PrescriptionItem::create([
                'prescription_id' => $rx->id,
                'medicine_id' => $panadol->id,
                'medicine_name' => 'Panadol 500mg',
                'dosage' => '2 Tablets',
                'frequency' => 'TDS',
                'duration' => '5 days',
                'quantity_prescribed' => 250,
                'quantity_dispensed' => 0,
            ]);
        });

        // Execute Dispensing API
        $res = $this->withHeaders($headers)->postJson("/api/pharmacy/dispense/{$prescriptionId}");
        $res->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'dispense_status' => 'DISPENSED',
                ],
            ]);

        // Verify physical database batch deductions
        $tenant->run(function () use ($batchAId, $batchBId, $prescriptionId) {
            $bA = MedicineBatch::find($batchAId);
            $bB = MedicineBatch::find($batchBId);

            // Batch A was depleted completely (200 -> 0)
            $this->assertEquals(0, $bA->quantity_available);

            // Batch B had remaining 50 deducted (500 -> 450)
            $this->assertEquals(450, $bB->quantity_available);

            $rxItem = PrescriptionItem::where('prescription_id', $prescriptionId)->first();
            $this->assertEquals(250, $rxItem->quantity_dispensed);
            $this->assertEquals(1500.00, (float) $rxItem->total_price); // 250 * 6.00 = 1500.00

            // Cleanup
            Visit::where('booking_reference', 'APT-FIFO-TEST')->delete();
        });
    }

    public function test_external_prescription_bypass_when_pharmacy_disabled(): void
    {
        // Suwa Piyasa clinic has pharmacy_enabled = false
        $headers = $this->getAuthHeaders('suwapiyasa');
        $tenant = Tenant::findOrFail('suwapiyasa');

        $prescriptionId = null;
        $tenant->run(function () use (&$prescriptionId) {
            $doctor = Doctor::first();
            $patient = Patient::firstOrCreate(
                ['phone' => '0711112222'],
                [
                    'patient_id' => 'MF-SUWA-001',
                    'first_name' => 'Ruwan',
                    'last_name' => 'Kumara',
                    'gender' => 'male',
                ]
            );

            Visit::where('booking_reference', 'APT-EXT-TEST')->delete();

            $visit = Visit::create([
                'patient_id' => $patient->id,
                'doctor_id' => $doctor->id,
                'token_number' => 12,
                'visit_date' => date('Y-m-d'),
                'status' => 'IN_CONSULTATION',
                'priority_level' => 'NORMAL',
                'booking_reference' => 'APT-EXT-TEST',
            ]);

            $rx = Prescription::create([
                'visit_id' => $visit->id,
                'patient_id' => $patient->id,
                'doctor_id' => $doctor->id,
                'dispense_status' => 'PENDING',
            ]);
            $prescriptionId = $rx->id;

            PrescriptionItem::create([
                'prescription_id' => $rx->id,
                'medicine_name' => 'External Amoxil 500mg',
                'dosage' => '1 Cap',
                'frequency' => 'TDS',
                'duration' => '5 days',
                'quantity_prescribed' => 15,
                'quantity_dispensed' => 0,
            ]);
        });

        $res = $this->withHeaders($headers)->postJson("/api/pharmacy/dispense/{$prescriptionId}");
        $res->assertStatus(200);

        // Bypasses batch deductions and marks EXTERNAL
        $this->assertEquals('EXTERNAL', $res->json('data.dispense_status'));

        $tenant->run(function () {
            Visit::where('booking_reference', 'APT-EXT-TEST')->delete();
        });
    }

    public function test_dual_mode_combined_billing_and_cashier_settlement(): void
    {
        $headers = $this->getAuthHeaders('arogya');
        $tenant = Tenant::findOrFail('arogya');

        $visitId = null;
        $tenant->run(function () use (&$visitId) {
            $doctor = Doctor::first();
            $doctor->update(['consultation_fee' => 1500.00]);
            $patient = Patient::firstOrCreate(
                ['phone' => '0779998888'],
                [
                    'patient_id' => 'MF-FIFO-001',
                    'first_name' => 'Saman',
                    'last_name' => 'Perera',
                    'gender' => 'male',
                ]
            );

            Visit::where('booking_reference', 'APT-BILL-0088')->delete();

            $visit = Visit::create([
                'patient_id' => $patient->id,
                'doctor_id' => $doctor->id,
                'token_number' => 88,
                'visit_date' => date('Y-m-d'),
                'status' => 'COMPLETED',
                'priority_level' => 'NORMAL',
                'booking_reference' => 'APT-BILL-0088',
            ]);
            $visitId = $visit->id;

            $rx = Prescription::create([
                'visit_id' => $visit->id,
                'patient_id' => $patient->id,
                'doctor_id' => $doctor->id,
                'dispense_status' => 'DISPENSED',
            ]);

            PrescriptionItem::create([
                'prescription_id' => $rx->id,
                'medicine_name' => 'Panadol 500mg',
                'dosage' => '2 Tabs',
                'frequency' => 'TDS',
                'duration' => '3 days',
                'quantity_prescribed' => 18,
                'quantity_dispensed' => 18,
                'unit_price' => 6.00,
                'total_price' => 108.00,
            ]);
        });

        // 1. Get computed combined bill: Consultation (1500) + Pharmacy (108) = 1608
        $billRes = $this->withHeaders($headers)->getJson("/api/invoices/visit/{$visitId}");
        $billRes->assertStatus(200);
        $this->assertEquals(1500.00, (float) $billRes->json('data.consultation_fee'));
        $this->assertEquals(108.00, (float) $billRes->json('data.pharmacy_fee'));
        $this->assertEquals(1608.00, (float) $billRes->json('data.total_amount'));
        $this->assertEquals('UNPAID', $billRes->json('data.status'));

        $invoiceId = $billRes->json('data.id');

        // 2. Settle payment via Card
        $settleRes = $this->withHeaders($headers)->postJson("/api/invoices/{$invoiceId}/settle", [
            'payment_method' => 'CREDIT_CARD',
            'amount' => 1608.00,
            'reference_note' => 'Commercial Bank Visa 4111',
        ]);
        $settleRes->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'invoice' => [
                        'status' => 'PAID',
                        'balance_due' => 0.00,
                    ],
                    'payment' => [
                        'payment_method' => 'CREDIT_CARD',
                        'amount' => 1608.00,
                    ],
                ],
            ]);

        // 3. Verify Day-End Reconciliation Report
        $reportRes = $this->withHeaders($headers)->getJson('/api/reports/reconciliation');
        $reportRes->assertStatus(200);
        $this->assertGreaterThanOrEqual(1608.00, (float) $reportRes->json('data.total_collected'));
        $this->assertGreaterThanOrEqual(1608.00, (float) $reportRes->json('data.payment_breakdown.card'));

        $tenant->run(function () use ($visitId) {
            Visit::where('id', $visitId)->delete();
        });
    }
}
