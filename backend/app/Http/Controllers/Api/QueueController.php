<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Visit;
use App\Services\QueueManagerService;
use App\Services\SmsNotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class QueueController extends Controller
{
    public function __construct(
        protected QueueManagerService $queueService,
        protected SmsNotificationService $smsService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $doctorId = $request->query('doctor_id');
        $date = $request->query('date');

        if (!$doctorId) {
            $firstDoc = \App\Models\Doctor::where('is_active', true)->first();
            $doctorId = $firstDoc ? $firstDoc->id : 1;
        }

        $queue = $this->queueService->getOrderedQueue(
            doctorId: (int) $doctorId,
            date: $date
        );

        return response()->json([
            'success' => true,
            'data' => $queue,
        ]);
    }

    public function checkIn(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'reference' => 'required|string',
            'date' => 'nullable|date',
        ]);

        try {
            $visit = $this->queueService->checkIn($validated['reference'], $validated['date'] ?? null);
            $visit->load(['patient', 'doctor.user']);

            // Get updated position in queue
            $queue = $this->queueService->getOrderedQueue($visit->doctor_id, $visit->visit_date->toDateString());
            $position = $queue['waiting_list']->firstWhere('id', $visit->id)->waiting_position ?? 1;

            // Audit Trail (PDPA & HIPAA Compliance)
            \App\Services\AuditLogService::log(
                action: 'CHECKED_IN_PATIENT',
                resourceType: 'Visit',
                resourceId: $visit->id,
                patientId: $visit->patient?->patient_id,
                details: ['token_number' => $visit->token_number, 'patient_name' => $visit->patient?->full_name]
            );

            return response()->json([
                'success' => true,
                'message' => "Attendance confirmed for Token #{$visit->token_number}",
                'data' => [
                    'visit' => $visit,
                    'waiting_position' => $position,
                    'checked_in_at' => $visit->checked_in_at,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    public function call(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'visit_id' => 'required|exists:visits,id',
        ]);

        $visit = $this->queueService->callPatient($validated['visit_id']);

        // Send Doctor Calling SMS
        $this->smsService->sendDoctorCallingSms($visit);

        return response()->json([
            'success' => true,
            'message' => "Token #{$visit->token_number} called",
            'data' => $visit,
        ]);
    }

    public function startConsultation(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'visit_id' => 'required|exists:visits,id',
        ]);

        $visit = $this->queueService->startConsultation($validated['visit_id']);

        return response()->json([
            'success' => true,
            'message' => "Consultation started for Token #{$visit->token_number}",
            'data' => $visit,
        ]);
    }

    public function missed(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'visit_id' => 'required|exists:visits,id',
        ]);

        $visit = $this->queueService->markMissed($validated['visit_id']);

        return response()->json([
            'success' => true,
            'message' => "Token #{$visit->token_number} marked as missed",
            'data' => $visit,
        ]);
    }

    public function complete(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'visit_id' => 'required|exists:visits,id',
        ]);

        $visit = $this->queueService->completeVisit($validated['visit_id']);

        return response()->json([
            'success' => true,
            'message' => "Visit completed for Token #{$visit->token_number}",
            'data' => $visit,
        ]);
    }

    public function emergencyPriority(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'visit_id' => 'required|exists:visits,id',
            'reason' => 'required|string|min:5',
        ]);

        $visit = $this->queueService->setEmergencyPriority($validated['visit_id'], $validated['reason']);

        return response()->json([
            'success' => true,
            'message' => "Emergency priority applied to Token #{$visit->token_number}",
            'data' => $visit,
        ]);
    }
}
