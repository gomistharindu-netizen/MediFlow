<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\Tenant;

class TenantApiTest extends TestCase
{
    public function test_can_fetch_tenant_settings_for_different_clinics(): void
    {
        // 1. Fetch Arogya Settings
        $responseArogya = $this->withHeaders(['X-Tenant' => 'arogya'])
            ->getJson('/api/settings');

        $responseArogya->assertStatus(200)
            ->assertJson([
                'success' => true,
                'tenant' => 'arogya',
                'settings' => [
                    'consultation_payment_timing' => 'AFTER',
                    'pharmacy_enabled' => true,
                ],
            ]);

        // 2. Fetch Suwa Piyasa Settings (Different DB & Settings)
        $responseSuwa = $this->withHeaders(['X-Tenant' => 'suwapiyasa'])
            ->getJson('/api/settings');

        $responseSuwa->assertStatus(200)
            ->assertJson([
                'success' => true,
                'tenant' => 'suwapiyasa',
                'settings' => [
                    'consultation_payment_timing' => 'BEFORE',
                    'pharmacy_enabled' => false,
                ],
            ]);
    }

    public function test_can_authenticate_staff_in_tenant_database(): void
    {
        $response = $this->withHeaders(['X-Tenant' => 'arogya'])
            ->postJson('/api/auth/login', [
                'email' => 'doctor@clinic.com',
                'password' => 'password123',
            ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'token',
                'user' => [
                    'id',
                    'name',
                    'email',
                    'roles',
                    'doctor_profile',
                ],
            ]);
    }

    public function test_can_register_patient_and_prevent_duplicates(): void
    {
        // Login first
        $loginRes = $this->withHeaders(['X-Tenant' => 'arogya'])
            ->postJson('/api/auth/login', [
                'email' => 'reception@clinic.com',
                'password' => 'password123',
            ]);

        $token = $loginRes->json('token');
        $uniquePhone = '077' . rand(1000000, 9999999);

        // Register patient
        $patientData = [
            'first_name' => 'TestPatient_' . rand(100, 999),
            'last_name' => 'Gunawardena',
            'phone' => $uniquePhone,
            'date_of_birth' => '1988-05-14',
            'gender' => 'male',
            'allergies' => ['Penicillin'],
            'chronic_conditions' => ['Hypertension'],
        ];

        $registerRes = $this->withHeaders([
            'X-Tenant' => 'arogya',
            'Authorization' => "Bearer {$token}",
        ])->postJson('/api/patients', $patientData);

        $registerRes->assertStatus(201)
            ->assertJson([
                'success' => true,
                'data' => [
                    'phone' => $uniquePhone,
                ],
            ]);

        // Attempt Duplicate Registration
        $dupRes = $this->withHeaders([
            'X-Tenant' => 'arogya',
            'Authorization' => "Bearer {$token}",
        ])->postJson('/api/patients', $patientData);

        $dupRes->assertStatus(409)
            ->assertJson([
                'success' => false,
                'is_duplicate' => true,
            ]);
    }
}
