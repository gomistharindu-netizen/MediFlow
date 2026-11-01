<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\Tenant;
use App\Models\Patient;
use App\Models\Visit;
use App\Models\Doctor;
use App\Models\Medicine;

class DoctorEmrConsultationTest extends TestCase
{
    private function getAuthHeaders(): array
    {
        $loginRes = $this->withHeaders(['X-Tenant' => 'arogya'])
            ->postJson('/api/auth/login', [
                'email' => 'doctor@clinic.com',
                'password' => 'password123',
            ]);
        $token = $loginRes->json('token');

        return [
            'X-Tenant' => 'arogya',
            'Authorization' => "Bearer {$token}",
            'Accept' => 'application/json',
        ];
    }

    public function test_medicine_catalog_search_and_allergy_tagging(): void
    {
        $headers = $this->getAuthHeaders();

        // 1. Search for Paracetamol / Panadol
        $res = $this->withHeaders($headers)->getJson('/api/medicines?search=panadol');
        $res->assertStatus(200);
        $this->assertNotEmpty($res->json('data'));
        $this->assertFalse($res->json('data.0.is_penicillin'));

        // 2. Search for Amoxicillin / Amoxil
        $resAmox = $this->withHeaders($headers)->getJson('/api/medicines?search=amox');
        $resAmox->assertStatus(200);
        $this->assertNotEmpty($resAmox->json('data'));
        $this->assertTrue($resAmox->json('data.0.is_penicillin'));
    }

    public function test_critical_allergy_safety_guard_blocks_contraindicated_prescription(): void
    {
        $headers = $this->getAuthHeaders();
        $tenant = Tenant::findOrFail('arogya');

        $visitId = null;
        $tenant->run(function () use (&$visitId) {
            $doctor = Doctor::first();
            $patient = Patient::where('allergies', 'LIKE', '%Penicillin%')->first();

            $visit = Visit::create([
                'patient_id' => $patient->id,
                'doctor_id' => $doctor->id,
                'token_number' => 99,
                'visit_date' => date('Y-m-d'),
                'status' => 'IN_CONSULTATION',
                'priority_level' => 'NORMAL',
                'booking_reference' => 'APT-ALLERGY-TEST',
            ]);
            $visitId = $visit->id;
        });

        // Attempt to prescribe Amoxil (Penicillin derivative) to Penicillin-allergic patient
        $payload = [
            'vitals' => [
                'bp' => '130/80',
                'pulse' => 74,
                'temp' => '98.6',
            ],
            'chief_complaint' => 'Sore throat and fever',
            'diagnosis' => 'Acute Tonsillitis',
            'clinical_notes' => 'Severe tonsillar hyperemia.',
            'prescriptions' => [
                [
                    'medicine_name' => 'Amoxil 500mg (Amoxicillin)',
                    'dosage' => '1 Capsule',
                    'frequency' => 'TDS',
                    'duration' => '5 days',
                    'quantity' => 15,
                ],
            ],
            'allergy_override' => false,
        ];

        $res = $this->withHeaders($headers)->postJson("/api/consultations/{$visitId}", $payload);

        // MUST FAIL with 422 Unprocessable Entity
        $res->assertStatus(422)
            ->assertJson([
                'success' => false,
                'error_code' => 'ALLERGY_CONTRAINDICATION',
            ]);

        $this->assertStringContainsString('strictly contraindicated', $res->json('message'));

        // Cleanup
        $tenant->run(function () use ($visitId) {
            Visit::where('id', $visitId)->delete();
        });
    }

    public function test_successful_consultation_completion_and_prescription_dispatch(): void
    {
        $headers = $this->getAuthHeaders();
        $tenant = Tenant::findOrFail('arogya');

        $visitId = null;
        $tenant->run(function () use (&$visitId) {
            $doctor = Doctor::first();
            $patient = Patient::first();

            $visit = Visit::create([
                'patient_id' => $patient->id,
                'doctor_id' => $doctor->id,
                'token_number' => 101,
                'visit_date' => date('Y-m-d'),
                'status' => 'IN_CONSULTATION',
                'priority_level' => 'NORMAL',
                'booking_reference' => 'APT-CONSULT-0101',
            ]);
            $visitId = $visit->id;
        });

        // Prescribe safe medicine (Panadol + Cetirizine)
        $payload = [
            'vitals' => [
                'bp' => '120/80',
                'pulse' => 72,
                'temp' => '98.4',
                'weight' => 65.0,
            ],
            'chief_complaint' => 'Common cold symptoms',
            'diagnosis' => 'Upper Respiratory Tract Infection (URTI)',
            'clinical_notes' => 'Mild nasal congestion, chest clear.',
            'prescriptions' => [
                [
                    'medicine_name' => 'Panadol 500mg',
                    'dosage' => '2 Tablets',
                    'frequency' => 'TDS',
                    'duration' => '3 days',
                    'instructions' => 'After meals',
                    'quantity' => 18,
                ],
                [
                    'medicine_name' => 'Cetirizine 10mg',
                    'dosage' => '1 Tablet',
                    'frequency' => 'Nocte',
                    'duration' => '5 days',
                    'instructions' => 'At night',
                    'quantity' => 5,
                ],
            ],
            'general_instructions' => 'Drink warm fluids, rest for 2 days.',
        ];

        $res = $this->withHeaders($headers)->postJson("/api/consultations/{$visitId}", $payload);
        $res->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'visit' => [
                        'status' => 'COMPLETED',
                    ],
                ],
            ]);

        $this->assertCount(2, $res->json('data.prescription.items'));

        // Cleanup
        $tenant->run(function () use ($visitId) {
            Visit::where('id', $visitId)->delete();
        });
    }

    public function test_patient_medical_history_and_lab_records(): void
    {
        $headers = $this->getAuthHeaders();
        $tenant = Tenant::findOrFail('arogya');

        $patientId = null;
        $tenant->run(function () use (&$patientId) {
            $patientId = Patient::first()->id;
        });

        // 1. Get patient medical history timeline
        $res = $this->withHeaders($headers)->getJson("/api/patients/{$patientId}/history");
        $res->assertStatus(200);
        $this->assertNotNull($res->json('data.patient'));
        $this->assertIsArray($res->json('data.past_visits'));

        // 2. Upload a new Lab Report
        $labRes = $this->withHeaders($headers)->postJson('/api/lab-reports', [
            'patient_id' => $patientId,
            'test_name' => 'Full Blood Count (FBC)',
            'laboratory_name' => 'Asiri Laboratories',
            'test_date' => date('Y-m-d'),
        ]);
        $labRes->assertStatus(201);
        $this->assertNotNull($labRes->json('data.extracted_parameters.Haemoglobin'));

        $labReportId = $labRes->json('data.id');

        // 3. Doctor signs off on Lab Report
        $reviewRes = $this->withHeaders($headers)->patchJson("/api/lab-reports/{$labReportId}/review", [
            'doctor_review_notes' => 'Haemoglobin and platelet levels within normal limits. Clinically stable.',
        ]);
        $reviewRes->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'status' => 'REVIEWED',
                ],
            ]);
    }
}
