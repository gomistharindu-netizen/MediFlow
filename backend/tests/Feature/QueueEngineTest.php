<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\Tenant;
use App\Models\Visit;
use App\Models\Patient;

class QueueEngineTest extends TestCase
{
    public function test_fair_queue_16_vs_24_rule_execution(): void
    {
        // 1. Staff Login to Arogya Clinic
        $loginRes = $this->withHeaders(['X-Tenant' => 'arogya'])
            ->postJson('/api/auth/login', [
                'email' => 'reception@clinic.com',
                'password' => 'password123',
            ]);
        $token = $loginRes->json('token');

        $headers = [
            'X-Tenant' => 'arogya',
            'Authorization' => "Bearer {$token}",
        ];

        // 2. Fetch Doctor
        $docRes = $this->withHeaders($headers)->getJson('/api/doctors');
        $doctorId = $docRes->json('data.0.id');

        // 3. Create Two Test Patients directly inside tenant DB
        $tenant = Tenant::findOrFail('arogya');
        $today = date('Y-m-d');

        $patAId = null;
        $patBId = null;
        $visit16Id = null;
        $visit24Id = null;

        $tenant->run(function () use ($doctorId, $today, &$patAId, &$patBId, &$visit16Id, &$visit24Id) {
            $pA = Patient::firstOrCreate(
                ['phone' => '0719999991'],
                [
                    'patient_id' => 'MF-TEST-0016',
                    'first_name' => 'Nimal',
                    'gender' => 'male',
                ]
            );
            $patAId = $pA->id;

            $pB = Patient::firstOrCreate(
                ['phone' => '0719999992'],
                [
                    'patient_id' => 'MF-TEST-0024',
                    'first_name' => 'Sunil',
                    'gender' => 'male',
                ]
            );
            $patBId = $pB->id;

            // Clear any prior mock visits
            Visit::whereIn('booking_reference', ['APT-MOCK-0016', 'APT-MOCK-0024'])->delete();

            $v16 = Visit::create([
                'patient_id' => $patAId,
                'doctor_id' => $doctorId,
                'token_number' => 16,
                'visit_date' => $today,
                'status' => 'NOT_CHECKED_IN',
                'priority_level' => 'NORMAL',
                'booking_reference' => 'APT-MOCK-0016',
            ]);
            $visit16Id = $v16->id;

            $v24 = Visit::create([
                'patient_id' => $patBId,
                'doctor_id' => $doctorId,
                'token_number' => 24,
                'visit_date' => $today,
                'status' => 'NOT_CHECKED_IN',
                'priority_level' => 'NORMAL',
                'booking_reference' => 'APT-MOCK-0024',
            ]);
            $visit24Id = $v24->id;
        });

        // 4. STEP 1: Token #24 checks in FIRST at 05:00 PM
        $checkin24 = $this->withHeaders(['X-Tenant' => 'arogya'])
            ->postJson('/api/checkin', [
                'reference' => 'APT-MOCK-0024',
            ]);
        $checkin24->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'waiting_position' => 1,
                ],
            ]);

        // Verify Token #24 is alone in waiting list at Position 1
        $queueAfter24 = $this->withHeaders(['X-Tenant' => 'arogya'])
            ->getJson("/api/queue?doctor_id={$doctorId}");
        $this->assertEquals(24, $queueAfter24->json('data.waiting_list.0.token_number'));
        $this->assertEquals(1, $queueAfter24->json('data.waiting_list.0.waiting_position'));

        // 5. STEP 2: Token #16 checks in LATER at 05:10 PM (Before turn has passed)
        $checkin16 = $this->withHeaders(['X-Tenant' => 'arogya'])
            ->postJson('/api/checkin', [
                'reference' => 'APT-MOCK-0016',
            ]);
        $checkin16->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'waiting_position' => 1,
                ],
            ]);

        // CRITICAL ASSERTION: The 16 vs 24 Rule!
        // Because Token #16's turn has not passed, #16 MUST be inserted AHEAD of #24!
        $queueAfter16 = $this->withHeaders(['X-Tenant' => 'arogya'])
            ->getJson("/api/queue?doctor_id={$doctorId}");

        $waitingList = $queueAfter16->json('data.waiting_list');
        $this->assertCount(2, $waitingList);
        
        // Position 1 MUST be Token #16!
        $this->assertEquals(16, $waitingList[0]['token_number']);
        $this->assertEquals(1, $waitingList[0]['waiting_position']);

        // Position 2 MUST be Token #24!
        $this->assertEquals(24, $waitingList[1]['token_number']);
        $this->assertEquals(2, $waitingList[1]['waiting_position']);

        // 6. STEP 3: Doctor Calls Token #16
        $callRes = $this->withHeaders($headers)->postJson('/api/queue/call', [
            'visit_id' => $visit16Id,
        ]);
        $callRes->assertStatus(200);

        // Start Consultation for #16
        $startRes = $this->withHeaders($headers)->postJson('/api/queue/start', [
            'visit_id' => $visit16Id,
        ]);
        $startRes->assertStatus(200);

        // In-Consultation Lock: Token #24 is now at Waiting Position 1
        $queueConsulting = $this->withHeaders(['X-Tenant' => 'arogya'])
            ->getJson("/api/queue?doctor_id={$doctorId}");
        $this->assertEquals(16, $queueConsulting->json('data.in_consultation.token_number'));
        $this->assertEquals(24, $queueConsulting->json('data.waiting_list.0.token_number'));

        // 7. STEP 4: Complete Token #16
        $compRes = $this->withHeaders($headers)->postJson('/api/queue/complete', [
            'visit_id' => $visit16Id,
        ]);
        $compRes->assertStatus(200);

        // Cleanup
        $tenant->run(function () use ($visit16Id, $visit24Id, $patAId, $patBId) {
            Visit::whereIn('id', [$visit16Id, $visit24Id])->delete();
            Patient::whereIn('id', [$patAId, $patBId])->forceDelete();
        });
    }
}
