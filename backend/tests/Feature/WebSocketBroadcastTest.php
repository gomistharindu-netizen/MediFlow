<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\Tenant;
use App\Models\Visit;
use App\Models\Patient;
use App\Events\PatientCalled;
use App\Events\QueueUpdated;
use Illuminate\Support\Facades\Event;

class WebSocketBroadcastTest extends TestCase
{
    public function test_websocket_events_dispatched_on_queue_actions(): void
    {
        Event::fake([
            PatientCalled::class,
            QueueUpdated::class,
        ]);

        // 1. Staff Login to Arogya Clinic
        $loginRes = $this->withHeaders(['X-Tenant' => 'arogya'])
            ->postJson('/api/auth/login', [
                'email' => 'doctor@clinic.com',
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

        // 3. Create a Test Patient & Visit inside tenant DB
        $tenant = Tenant::findOrFail('arogya');
        $today = date('Y-m-d');
        $visitId = null;
        $patientId = null;

        $tenant->run(function () use ($doctorId, $today, &$visitId, &$patientId) {
            $patient = Patient::firstOrCreate(
                ['phone' => '0778888888'],
                [
                    'patient_id' => 'MF-WS-0001',
                    'first_name' => 'Kamal',
                    'last_name' => 'Perera',
                    'gender' => 'male',
                ]
            );
            $patientId = $patient->id;

            $visit = Visit::create([
                'patient_id' => $patientId,
                'doctor_id' => $doctorId,
                'token_number' => 88,
                'visit_date' => $today,
                'status' => 'NOT_CHECKED_IN',
                'priority_level' => 'NORMAL',
                'booking_reference' => 'APT-WS-0088',
            ]);
            $visitId = $visit->id;
        });

        // 4. Test Check-In: Should dispatch QueueUpdated
        $checkinRes = $this->withHeaders(['X-Tenant' => 'arogya'])
            ->postJson('/api/checkin', [
                'reference' => 'APT-WS-0088',
            ]);
        $checkinRes->assertStatus(200);

        Event::assertDispatched(QueueUpdated::class, function ($event) use ($doctorId) {
            return $event->tenantId === 'arogya'
                && $event->doctorId === $doctorId
                && $event->action === 'checked_in'
                && $event->broadcastOn()[0]->name === 'tenant.arogya.queue';
        });

        // 5. Doctor Calls Patient: Should dispatch PatientCalled and QueueUpdated
        $callRes = $this->withHeaders($headers)->postJson('/api/queue/call', [
            'visit_id' => $visitId,
        ]);
        $callRes->assertStatus(200);

        Event::assertDispatched(PatientCalled::class, function ($event) use ($visitId) {
            return $event->tenantId === 'arogya'
                && $event->visitId === $visitId
                && $event->tokenNumber === 88
                && str_contains($event->patientName, 'Kamal')
                && $event->broadcastOn()[0]->name === 'tenant.arogya.queue'
                && $event->broadcastAs() === 'PatientCalled';
        });

        Event::assertDispatched(QueueUpdated::class, function ($event) use ($doctorId) {
            return $event->tenantId === 'arogya'
                && $event->doctorId === $doctorId
                && $event->action === 'called';
        });

        // 6. Start Consultation
        $startRes = $this->withHeaders($headers)->postJson('/api/queue/start', [
            'visit_id' => $visitId,
        ]);
        $startRes->assertStatus(200);

        Event::assertDispatched(QueueUpdated::class, function ($event) use ($doctorId) {
            return $event->tenantId === 'arogya'
                && $event->doctorId === $doctorId
                && $event->action === 'consultation_started';
        });

        // 7. Complete Visit
        $compRes = $this->withHeaders($headers)->postJson('/api/queue/complete', [
            'visit_id' => $visitId,
        ]);
        $compRes->assertStatus(200);

        Event::assertDispatched(QueueUpdated::class, function ($event) use ($doctorId) {
            return $event->tenantId === 'arogya'
                && $event->doctorId === $doctorId
                && $event->action === 'completed';
        });

        // Cleanup
        $tenant->run(function () use ($visitId, $patientId) {
            Visit::where('id', $visitId)->delete();
            Patient::where('id', $patientId)->forceDelete();
        });
    }
}
