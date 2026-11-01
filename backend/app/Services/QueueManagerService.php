<?php

namespace App\Services;

use App\Models\Visit;
use App\Models\DoctorSession;
use App\Models\ClinicSetting;
use App\Events\QueueUpdated;
use App\Events\PatientCalled;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Exception;

class QueueManagerService
{
    /**
     * Allocate next sequential token for a doctor session.
     */
    public function allocateToken(int $patientId, int $doctorId, ?int $sessionId = null, ?string $date = null): Visit
    {
        $visitDate = $date ?: date('Y-m-d');

        // Check Session Capacity if session is specified
        if ($sessionId) {
            $session = DoctorSession::findOrFail($sessionId);
            $currentCount = Visit::where('doctor_session_id', $sessionId)
                ->whereDate('visit_date', $visitDate)
                ->where('status', '!=', 'CANCELLED')
                ->count();

            if ($currentCount >= $session->max_patients) {
                throw ValidationException::withMessages([
                    'session' => ["Doctor session '{$session->session_title}' has reached its maximum capacity of {$session->max_patients} patients."],
                ]);
            }
        }

        // Determine Next Sequential Token Number for Doctor on that Date
        $maxToken = Visit::where('doctor_id', $doctorId)
            ->whereDate('visit_date', $visitDate)
            ->max('token_number') ?: 0;

        $nextToken = $maxToken + 1;

        $visit = Visit::create([
            'patient_id' => $patientId,
            'doctor_id' => $doctorId,
            'doctor_session_id' => $sessionId,
            'token_number' => $nextToken,
            'visit_date' => $visitDate,
            'status' => 'NOT_CHECKED_IN',
            'priority_level' => 'NORMAL',
        ]);

        $this->broadcastQueueChange($doctorId, 'token_allocated', $visit);

        return $visit;
    }

    /**
     * Confirm Attendance via QR Scanner or lookup.
     */
    public function checkIn(string $identifier, ?string $date = null): Visit
    {
        $visitDate = $date ?: date('Y-m-d');

        // Lookup by Booking Reference (QR) or ID
        $visit = Visit::where(function ($q) use ($identifier) {
            $q->where('booking_reference', $identifier)
              ->orWhere('uuid', $identifier);
        })->whereDate('visit_date', $visitDate)->first();

        if (!$visit) {
            throw new Exception("No appointment found for reference '{$identifier}' on {$visitDate}.");
        }

        if ($visit->status === 'CANCELLED') {
            throw new Exception("This appointment has been cancelled and cannot be checked in.");
        }

        if (in_array($visit->status, ['WAITING', 'CALLED', 'IN_CONSULTATION', 'COMPLETED'])) {
            // Repeated scan does not duplicate visit
            return $visit;
        }

        $visit->update([
            'status' => 'WAITING',
            'checked_in_at' => now(),
        ]);

        $this->broadcastQueueChange($visit->doctor_id, 'checked_in', $visit);

        return $visit;
    }

    /**
     * Compute Real-time Ordered Queue (Applying the 16 vs 24 Rule).
     */
    public function getOrderedQueue(int $doctorId, ?string $date = null): array
    {
        $visitDate = $date ?: date('Y-m-d');
        $policy = ClinicSetting::get('queue_late_arrival_policy', 'FAIR_16_24');

        $allVisits = Visit::with(['patient', 'doctor.user'])
            ->where('doctor_id', $doctorId)
            ->whereDate('visit_date', $visitDate)
            ->where('status', '!=', 'CANCELLED')
            ->get();

        // 1. In Consultation (Active)
        $inConsultation = $allVisits->firstWhere('status', 'IN_CONSULTATION');

        // 2. Currently Called
        $called = $allVisits->firstWhere('status', 'CALLED');

        // 3. Waiting Patients
        $waitingVisits = $allVisits->where('status', 'WAITING');

        // Split into Emergency vs Regular Waiting
        $emergencyWaiting = $waitingVisits->where('priority_level', 'EMERGENCY')->sortBy('checked_in_at');
        $regularWaiting = $waitingVisits->where('priority_level', 'NORMAL');

        if ($policy === 'FAIR_16_24') {
            // Natural token order preserved among checked-in patients whose turn has not passed
            $orderedRegular = $regularWaiting->sortBy('token_number');
        } else {
            // Strict arrival order
            $orderedRegular = $regularWaiting->sortBy('checked_in_at');
        }

        // Combine: Emergencies first, then ordered regular patients
        $finalWaitingList = $emergencyWaiting->concat($orderedRegular)->values();

        // Assign Dynamic Waiting Position (1, 2, 3...)
        $formattedWaiting = $finalWaitingList->map(function ($visit, $index) {
            $visit->waiting_position = $index + 1;
            return $visit;
        });

        // 4. Missed Patients (Awaiting recall)
        $missed = $allVisits->where('status', 'MISSED')->values();

        // 5. Not Checked In
        $notCheckedIn = $allVisits->where('status', 'NOT_CHECKED_IN')->sortBy('token_number')->values();

        // 6. Completed Today
        $completed = $allVisits->where('status', 'COMPLETED')->sortByDesc('completed_at')->values();

        return [
            'doctor_id' => $doctorId,
            'date' => $visitDate,
            'in_consultation' => $inConsultation,
            'called' => $called,
            'waiting_count' => $formattedWaiting->count(),
            'waiting_list' => $formattedWaiting,
            'missed_list' => $missed,
            'not_checked_in_list' => $notCheckedIn,
            'completed_count' => $completed->count(),
            'policy' => $policy,
        ];
    }

    /**
     * Call next patient.
     */
    public function callPatient(int $visitId): Visit
    {
        $visit = Visit::findOrFail($visitId);
        $visit->update([
            'status' => 'CALLED',
            'called_at' => now(),
        ]);

        $this->broadcastQueueChange($visit->doctor_id, 'called', $visit);

        return $visit;
    }

    /**
     * Patient enters doctor consultation room.
     */
    public function startConsultation(int $visitId): Visit
    {
        $visit = Visit::findOrFail($visitId);
        $visit->update([
            'status' => 'IN_CONSULTATION',
            'consultation_started_at' => now(),
        ]);

        $this->broadcastQueueChange($visit->doctor_id, 'consultation_started', $visit);

        return $visit;
    }

    /**
     * Mark patient missed/absent.
     */
    public function markMissed(int $visitId): Visit
    {
        $visit = Visit::findOrFail($visitId);
        $visit->update([
            'status' => 'MISSED',
        ]);

        $this->broadcastQueueChange($visit->doctor_id, 'missed', $visit);

        return $visit;
    }

    /**
     * Complete consultation visit.
     */
    public function completeVisit(int $visitId): Visit
    {
        $visit = Visit::findOrFail($visitId);
        $visit->update([
            'status' => 'COMPLETED',
            'completed_at' => now(),
        ]);

        $this->broadcastQueueChange($visit->doctor_id, 'completed', $visit);

        return $visit;
    }

    /**
     * Mark visit as emergency priority.
     */
    public function setEmergencyPriority(int $visitId, string $reason): Visit
    {
        $visit = Visit::findOrFail($visitId);
        $visit->update([
            'priority_level' => 'EMERGENCY',
            'priority_reason' => $reason,
        ]);

        $this->broadcastQueueChange($visit->doctor_id, 'emergency_priority', $visit);

        return $visit;
    }

    /**
     * Broadcast real-time queue changes to subscribed clients (TV display, doctor desk, reception).
     */
    public function broadcastQueueChange(int $doctorId, string $action, ?Visit $visit = null): void
    {
        try {
            $tenantId = tenant('id') ?? 'arogya';
            $queue = $this->getOrderedQueue($doctorId);
            event(new QueueUpdated($tenantId, $doctorId, $action, $queue));

            if ($action === 'called' && $visit) {
                $visit->loadMissing(['patient', 'doctor.user']);
                event(new PatientCalled(
                    tenantId: $tenantId,
                    visitId: $visit->id,
                    tokenNumber: $visit->token_number,
                    patientName: $visit->patient?->full_name ?? "Patient #{$visit->token_number}",
                    doctorName: $visit->doctor?->user?->name ?? 'Doctor',
                    roomNumber: $visit->doctor?->room_number ?? 'Room 01',
                    calledAt: $visit->called_at ? $visit->called_at->toIso8601String() : now()->toIso8601String()
                ));
            }
        } catch (\Throwable $e) {
            Log::warning("WebSocket broadcast skipped/failed: " . $e->getMessage());
        }
    }
}
