<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\QueueManagerService;
use App\Services\SmsNotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BookingController extends Controller
{
    public function __construct(
        protected QueueManagerService $queueService,
        protected SmsNotificationService $smsService
    ) {}

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'patient_id' => 'required|exists:patients,id',
            'doctor_id' => 'required|exists:doctors,id',
            'doctor_session_id' => 'nullable|exists:doctor_sessions,id',
            'date' => 'nullable|date',
        ]);

        $visit = $this->queueService->allocateToken(
            patientId: $validated['patient_id'],
            doctorId: $validated['doctor_id'],
            sessionId: $validated['doctor_session_id'] ?? null,
            date: $validated['date'] ?? null
        );

        $visit->load(['patient', 'doctor.user', 'session']);

        // Send Token SMS with live tracking link
        $this->smsService->sendTokenIssuedSms($visit);

        return response()->json([
            'success' => true,
            'message' => "Token #{$visit->token_number} allocated successfully",
            'data' => [
                'visit_id' => $visit->id,
                'uuid' => $visit->uuid,
                'token_number' => $visit->token_number,
                'booking_reference' => $visit->booking_reference,
                'visit_date' => $visit->visit_date->toDateString(),
                'status' => $visit->status,
                'patient' => [
                    'id' => $visit->patient->id,
                    'patient_id' => $visit->patient->patient_id,
                    'name' => $visit->patient->full_name,
                    'phone' => $visit->patient->phone,
                ],
                'doctor' => [
                    'name' => $visit->doctor->user->name,
                    'specialization' => $visit->doctor->specialization,
                    'room' => $visit->doctor->room_number,
                ],
                'qr_data' => $visit->booking_reference, // QR string for 2D scanner
            ],
        ], 201);
    }
}
