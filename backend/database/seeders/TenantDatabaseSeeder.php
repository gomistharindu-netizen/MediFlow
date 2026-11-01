<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use App\Models\User;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class TenantDatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // 1. Create Core Permissions
        $permissions = [
            'view patients', 'create patients', 'edit patients',
            'create bookings', 'manage queue', 'checkin patients',
            'view consultations', 'conduct consultations', 'create prescriptions',
            'manage pharmacy inventory', 'dispense medicines',
            'create bills', 'collect payments', 'view financial reports',
            'manage clinic settings', 'manage doctors'
        ];

        foreach ($permissions as $perm) {
            Permission::firstOrCreate(['name' => $perm, 'guard_name' => 'web']);
        }

        // 2. Create Roles and Assign Permissions
        $adminRole = Role::firstOrCreate(['name' => 'ClinicAdmin', 'guard_name' => 'web']);
        $adminRole->syncPermissions(Permission::all());

        $doctorRole = Role::firstOrCreate(['name' => 'Doctor', 'guard_name' => 'web']);
        $doctorRole->syncPermissions([
            'view patients', 'view consultations', 'conduct consultations', 
            'create prescriptions', 'manage queue'
        ]);

        $receptionRole = Role::firstOrCreate(['name' => 'Receptionist', 'guard_name' => 'web']);
        $receptionRole->syncPermissions([
            'view patients', 'create patients', 'edit patients',
            'create bookings', 'manage queue', 'checkin patients', 'create bills'
        ]);

        $pharmacyRole = Role::firstOrCreate(['name' => 'Pharmacist', 'guard_name' => 'web']);
        $pharmacyRole->syncPermissions([
            'view patients', 'manage pharmacy inventory', 'dispense medicines', 'create bills'
        ]);

        $cashierRole = Role::firstOrCreate(['name' => 'Cashier', 'guard_name' => 'web']);
        $cashierRole->syncPermissions([
            'view patients', 'create bills', 'collect payments', 'view financial reports'
        ]);

        // 3. Create Default Staff Accounts
        $admin = User::firstOrCreate(
            ['email' => 'admin@clinic.com'],
            [
                'name' => 'Clinic Administrator',
                'password' => Hash::make('password123'),
                'email_verified_at' => now(),
            ]
        );
        $admin->assignRole($adminRole);

        $doctorUser = User::firstOrCreate(
            ['email' => 'doctor@clinic.com'],
            [
                'name' => 'Dr. Sanath Silva',
                'password' => Hash::make('password123'),
                'email_verified_at' => now(),
            ]
        );
        $doctorUser->assignRole($doctorRole);

        $receptionUser = User::firstOrCreate(
            ['email' => 'reception@clinic.com'],
            [
                'name' => 'Kavindi Perera',
                'password' => Hash::make('password123'),
                'email_verified_at' => now(),
            ]
        );
        $receptionUser->assignRole($receptionRole);

        $cashierUser = User::firstOrCreate(
            ['email' => 'cashier@clinic.com'],
            [
                'name' => 'Nimal Jayawardena',
                'password' => Hash::make('password123'),
                'email_verified_at' => now(),
            ]
        );
        $cashierUser->assignRole($cashierRole);

        $pharmacyUser = User::firstOrCreate(
            ['email' => 'pharmacy@clinic.com'],
            [
                'name' => 'Nadeesha Fernando',
                'password' => Hash::make('password123'),
                'email_verified_at' => now(),
            ]
        );
        $pharmacyUser->assignRole($pharmacyRole);

        // 4. Create Doctor Profile & Sessions
        $doctor = DB::table('doctors')->updateOrInsert(
            ['user_id' => $doctorUser->id],
            [
                'slmc_reg_no' => 'SLMC-34821',
                'specialization' => 'Family Medicine & General Practice',
                'qualifications' => 'MBBS (Colombo), MCGP (SL)',
                'consultation_fee' => 1500.00,
                'room_number' => 'Room 01',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        $doctorId = DB::table('doctors')->where('user_id', $doctorUser->id)->value('id');

        DB::table('doctor_sessions')->updateOrInsert(
            ['doctor_id' => $doctorId, 'session_title' => 'Evening Clinic'],
            [
                'day_of_week' => 'monday',
                'start_time' => '17:00:00',
                'end_time' => '21:00:00',
                'max_patients' => 30,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        // 5. Seed Default Clinic Settings
        $defaultSettings = [
            'consultation_payment_timing' => ['value' => 'AFTER', 'description' => 'Collect consultation fee BEFORE or AFTER consultation'],
            'pharmacy_enabled' => ['value' => true, 'description' => 'Enable in-house inventory and dispensing'],
            'queue_late_arrival_policy' => ['value' => 'FAIR_16_24', 'description' => 'Preserve booking order if patient arrives before turn passes'],
            'queue_missed_recall_penalty' => ['value' => 'END_OF_WAITING', 'description' => 'Recall placement for missed patients'],
            'sms_enabled' => ['value' => true, 'description' => 'Send SMS for appointments and turn alerts'],
            'sms_gateway_provider' => ['value' => 'mock', 'description' => 'SMS Gateway provider: notify_lk, dialog, mobitel, mock'],
            'sms_sender_mask' => ['value' => 'MEDIFLOW', 'description' => 'SMS Sender Mask'],
            'turn_alert_threshold' => ['value' => 3, 'description' => 'Alert patient when N patients remain ahead'],
            'thermal_printer_width' => ['value' => '80mm', 'description' => 'POS receipt print width: 80mm or 58mm'],
            'clinic_branding' => [
                'value' => [
                    'clinic_name' => 'Arogya Medical Centre',
                    'tagline' => 'Compassionate & Modern Outpatient Care',
                    'registration_no' => 'PHSRC/COL/2026/89',
                    'address' => 'No. 142, Galle Road, Colombo 03',
                    'phone' => '+94 11 258 9632',
                ],
                'description' => 'Clinic branding details for receipts and prescriptions'
            ],
        ];

        foreach ($defaultSettings as $key => $data) {
            DB::table('clinic_settings')->updateOrInsert(
                ['key' => $key],
                [
                    'value' => json_encode($data['value']),
                    'description' => $data['description'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }

        // 6. Seed Complete Clinical Medicines & FIFO Batches Catalog
        $catalog = [
            [
                'name' => 'Panadol 500mg',
                'generic_name' => 'Paracetamol',
                'dosage_form' => 'Tablet',
                'strength' => '500mg',
                'reorder_level' => 100,
                'unit' => 'tablets',
                'batches' => [
                    ['batch' => 'BCH-2026-A1', 'months' => 6, 'qty' => 500, 'cost' => 3.50, 'sell' => 6.00],
                    ['batch' => 'BCH-2026-B2', 'months' => 18, 'qty' => 1000, 'cost' => 3.75, 'sell' => 6.00],
                ],
            ],
            [
                'name' => 'Amoxil 500mg',
                'generic_name' => 'Amoxicillin',
                'dosage_form' => 'Capsule',
                'strength' => '500mg',
                'reorder_level' => 50,
                'unit' => 'capsules',
                'batches' => [
                    ['batch' => 'AMX-2026-09', 'months' => 12, 'qty' => 300, 'cost' => 18.00, 'sell' => 28.00],
                ],
            ],
            [
                'name' => 'Augmentin 625mg',
                'generic_name' => 'Co-Amoxiclav',
                'dosage_form' => 'Tablet',
                'strength' => '625mg',
                'reorder_level' => 30,
                'unit' => 'tablets',
                'batches' => [
                    ['batch' => 'AUG-2026-14', 'months' => 10, 'qty' => 200, 'cost' => 85.00, 'sell' => 120.00],
                ],
            ],
            [
                'name' => 'Zithrox 500mg',
                'generic_name' => 'Azithromycin',
                'dosage_form' => 'Tablet',
                'strength' => '500mg',
                'reorder_level' => 25,
                'unit' => 'tablets',
                'batches' => [
                    ['batch' => 'ZTX-2026-02', 'months' => 14, 'qty' => 150, 'cost' => 95.00, 'sell' => 140.00],
                ],
            ],
            [
                'name' => 'Omeprazole 20mg',
                'generic_name' => 'Omeprazole',
                'dosage_form' => 'Capsule',
                'strength' => '20mg',
                'reorder_level' => 80,
                'unit' => 'capsules',
                'batches' => [
                    ['batch' => 'OMP-2026-88', 'months' => 16, 'qty' => 600, 'cost' => 7.00, 'sell' => 12.00],
                ],
            ],
            [
                'name' => 'Cetirizine 10mg',
                'generic_name' => 'Cetirizine Hydrochloride',
                'dosage_form' => 'Tablet',
                'strength' => '10mg',
                'reorder_level' => 60,
                'unit' => 'tablets',
                'batches' => [
                    ['batch' => 'CTZ-2026-45', 'months' => 20, 'qty' => 500, 'cost' => 4.50, 'sell' => 8.00],
                ],
            ],
            [
                'name' => 'Domperidone 10mg',
                'generic_name' => 'Domperidone',
                'dosage_form' => 'Tablet',
                'strength' => '10mg',
                'reorder_level' => 40,
                'unit' => 'tablets',
                'batches' => [
                    ['batch' => 'DMP-2026-11', 'months' => 15, 'qty' => 400, 'cost' => 5.00, 'sell' => 9.50],
                ],
            ],
            [
                'name' => 'Metformin 500mg',
                'generic_name' => 'Metformin Hydrochloride',
                'dosage_form' => 'Tablet',
                'strength' => '500mg',
                'reorder_level' => 150,
                'unit' => 'tablets',
                'batches' => [
                    ['batch' => 'MET-2026-03', 'months' => 24, 'qty' => 1200, 'cost' => 3.20, 'sell' => 5.50],
                ],
            ],
            [
                'name' => 'Losartan Potassium 50mg',
                'generic_name' => 'Losartan Potassium',
                'dosage_form' => 'Tablet',
                'strength' => '50mg',
                'reorder_level' => 100,
                'unit' => 'tablets',
                'batches' => [
                    ['batch' => 'LOS-2026-55', 'months' => 22, 'qty' => 800, 'cost' => 6.50, 'sell' => 11.00],
                ],
            ],
            [
                'name' => 'Atorvastatin 20mg',
                'generic_name' => 'Atorvastatin Calcium',
                'dosage_form' => 'Tablet',
                'strength' => '20mg',
                'reorder_level' => 80,
                'unit' => 'tablets',
                'batches' => [
                    ['batch' => 'ATV-2026-72', 'months' => 18, 'qty' => 600, 'cost' => 12.00, 'sell' => 22.00],
                ],
            ],
            [
                'name' => 'Bactrim DS',
                'generic_name' => 'Trimethoprim / Sulfamethoxazole',
                'dosage_form' => 'Tablet',
                'strength' => '800mg/160mg',
                'reorder_level' => 30,
                'unit' => 'tablets',
                'batches' => [
                    ['batch' => 'BAC-2026-90', 'months' => 12, 'qty' => 250, 'cost' => 15.00, 'sell' => 25.00],
                ],
            ],
        ];

        foreach ($catalog as $item) {
            $existingMed = DB::table('medicines')->where('name', $item['name'])->first();
            if ($existingMed) {
                $medId = $existingMed->id;
            } else {
                $medId = DB::table('medicines')->insertGetId([
                    'name' => $item['name'],
                    'generic_name' => $item['generic_name'],
                    'dosage_form' => $item['dosage_form'],
                    'strength' => $item['strength'],
                    'reorder_level' => $item['reorder_level'],
                    'unit' => $item['unit'],
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            foreach ($item['batches'] as $b) {
                $batchExists = DB::table('medicine_batches')->where('batch_number', $b['batch'])->exists();
                if (!$batchExists) {
                    DB::table('medicine_batches')->insert([
                        'medicine_id' => $medId,
                        'batch_number' => $b['batch'],
                        'expiry_date' => now()->addMonths($b['months'])->toDateString(),
                        'quantity_received' => $b['qty'],
                        'quantity_available' => $b['qty'],
                        'purchase_unit_price' => $b['cost'],
                        'selling_unit_price' => $b['sell'],
                        'supplier_name' => 'State Pharmaceuticals Mfg',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }
        }

        // 7. Seed Past Consultation & Lab Reports for Patient 1
        $pat1 = DB::table('patients')->first();
        $doc1 = DB::table('doctors')->first();

        if ($pat1 && $doc1 && !DB::table('visits')->where('booking_reference', 'APT-20260915-HIST')->exists()) {
            $pastVisitId = DB::table('visits')->insertGetId([
                'uuid' => (string) \Illuminate\Support\Str::uuid(),
                'patient_id' => $pat1->id,
                'doctor_id' => $doc1->id,
                'doctor_session_id' => 1,
                'booking_reference' => 'APT-20260915-HIST',
                'token_number' => 8,
                'visit_date' => now()->subWeeks(4)->toDateString(),
                'status' => 'COMPLETED',
                'priority_level' => 'NORMAL',
                'checked_in_at' => now()->subWeeks(4)->setTime(17, 10),
                'called_at' => now()->subWeeks(4)->setTime(17, 25),
                'consultation_started_at' => now()->subWeeks(4)->setTime(17, 26),
                'completed_at' => now()->subWeeks(4)->setTime(17, 34),
                'vitals' => json_encode([
                    'bp' => '138/88',
                    'pulse' => 78,
                    'temp' => '99.1',
                    'weight' => 69.0,
                    'sugar' => 135,
                    'spo2' => 98,
                ]),
                'chief_complaint' => 'Dry cough and sore throat for 3 days',
                'diagnosis' => 'Acute Pharyngitis / URTI',
                'clinical_notes' => 'Tonsils mildly congested, no exudates. Chest bilaterally clear. Advised warm salt water gargle.',
                'created_at' => now()->subWeeks(4),
                'updated_at' => now()->subWeeks(4),
            ]);

            $pastRxId = DB::table('prescriptions')->insertGetId([
                'visit_id' => $pastVisitId,
                'patient_id' => $pat1->id,
                'doctor_id' => $doc1->id,
                'dispense_status' => 'DISPENSED',
                'general_instructions' => 'Take with full glass of water. Review in 1 week if cough persists.',
                'follow_up_date' => now()->subWeeks(3)->toDateString(),
                'created_at' => now()->subWeeks(4),
                'updated_at' => now()->subWeeks(4),
            ]);

            DB::table('prescription_items')->insert([
                [
                    'prescription_id' => $pastRxId,
                    'medicine_name' => 'Panadol 500mg',
                    'dosage' => '2 Tablets',
                    'frequency' => 'TDS',
                    'duration' => '3 days',
                    'instructions' => 'After meals for fever & pain',
                    'quantity_prescribed' => 18,
                    'quantity_dispensed' => 18,
                    'unit_price' => 6.00,
                    'total_price' => 108.00,
                    'created_at' => now()->subWeeks(4),
                    'updated_at' => now()->subWeeks(4),
                ],
                [
                    'prescription_id' => $pastRxId,
                    'medicine_name' => 'Cetirizine 10mg',
                    'dosage' => '1 Tablet',
                    'frequency' => 'Nocte',
                    'duration' => '5 days',
                    'instructions' => 'At bedtime',
                    'quantity_prescribed' => 5,
                    'quantity_dispensed' => 5,
                    'unit_price' => 8.00,
                    'total_price' => 40.00,
                    'created_at' => now()->subWeeks(4),
                    'updated_at' => now()->subWeeks(4),
                ],
            ]);

            // Seed 2 Lab Reports (FBC & Lipid Profile)
            DB::table('lab_reports')->insert([
                [
                    'patient_id' => $pat1->id,
                    'visit_id' => $pastVisitId,
                    'test_name' => 'Full Blood Count (FBC)',
                    'laboratory_name' => 'Asiri Laboratories Colombo',
                    'test_date' => now()->subWeeks(3)->toDateString(),
                    'status' => 'REVIEWED',
                    'file_path' => 'demo/fbc_sample.pdf',
                    'file_mime_type' => 'application/pdf',
                    'extracted_parameters' => json_encode([
                        'Haemoglobin' => '14.2 g/dL (Ref: 13.0 - 17.0)',
                        'WBC Count' => '7,400 /uL (Ref: 4,000 - 11,000)',
                        'Platelets' => '245,000 /uL (Ref: 150,000 - 450,000)',
                        'Neutrophils' => '62% (Ref: 40 - 75)',
                        'Lymphocytes' => '28% (Ref: 20 - 45)',
                        'ESR 1st Hour' => '12 mm (Ref: < 15)',
                    ]),
                    'doctor_review_notes' => 'FBC completely normal. Viral infection resolved.',
                    'reviewed_by_doctor_id' => $doc1->id,
                    'reviewed_at' => now()->subWeeks(3),
                    'created_at' => now()->subWeeks(3),
                    'updated_at' => now()->subWeeks(3),
                ],
                [
                    'patient_id' => $pat1->id,
                    'visit_id' => null,
                    'test_name' => 'Lipid Profile & Serum Creatinine',
                    'laboratory_name' => 'Durdans Hospital Diagnostic Centre',
                    'test_date' => now()->subWeeks(1)->toDateString(),
                    'status' => 'RECEIVED',
                    'file_path' => 'demo/lipid_profile.pdf',
                    'file_mime_type' => 'application/pdf',
                    'extracted_parameters' => json_encode([
                        'Total Cholesterol' => '218 mg/dL (Desirable: < 200)',
                        'Triglycerides' => '165 mg/dL (Borderline: 150 - 199)',
                        'HDL (Good)' => '42 mg/dL (> 40)',
                        'LDL (Bad)' => '143 mg/dL (Optimal: < 100)',
                        'Serum Creatinine' => '0.95 mg/dL (Ref: 0.7 - 1.2)',
                        'eGFR' => '> 90 mL/min/1.73m2 (Normal)',
                    ]),
                    'doctor_review_notes' => null,
                    'reviewed_by_doctor_id' => null,
                    'reviewed_at' => null,
                    'created_at' => now()->subWeeks(1),
                    'updated_at' => now()->subWeeks(1),
                ],
            ]);
        }
    }
}
