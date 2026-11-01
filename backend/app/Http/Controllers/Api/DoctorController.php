<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Doctor;
use App\Models\DoctorSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DoctorController extends Controller
{
    public function index(): JsonResponse
    {
        $doctors = Doctor::with(['user', 'sessions' => function ($q) {
            $q->where('is_active', true);
        }])
        ->where('is_active', true)
        ->get();

        return response()->json([
            'success' => true,
            'data' => $doctors,
        ]);
    }

    public function sessions(): JsonResponse
    {
        $sessions = DoctorSession::with('doctor.user')
            ->where('is_active', true)
            ->get();

        return response()->json([
            'success' => true,
            'data' => $sessions,
        ]);
    }

    /**
     * Create a new recurring session for a doctor.
     */
    public function storeSession(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'doctor_id'     => 'required|exists:doctors,id',
            'session_title' => 'required|string|max:255',
            'day_of_week'   => 'required|in:Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday',
            'start_time'    => 'required|date_format:H:i',
            'end_time'      => 'required|date_format:H:i|after:start_time',
            'max_patients'  => 'required|integer|min:1|max:200',
            'is_active'     => 'sometimes|boolean',
        ]);

        $session = DoctorSession::create($validated);
        $session->load('doctor.user');

        return response()->json([
            'success' => true,
            'message' => 'Doctor session created.',
            'data'    => $session,
        ], 201);
    }

    /**
     * Update a doctor session (e.g., change time, max patients, toggle active).
     */
    public function updateSession(Request $request, int $id): JsonResponse
    {
        $session = DoctorSession::findOrFail($id);

        $validated = $request->validate([
            'session_title' => 'sometimes|string|max:255',
            'day_of_week'   => 'sometimes|in:Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday',
            'start_time'    => 'sometimes|date_format:H:i',
            'end_time'      => 'sometimes|date_format:H:i',
            'max_patients'  => 'sometimes|integer|min:1|max:200',
            'is_active'     => 'sometimes|boolean',
        ]);

        $session->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Session updated.',
            'data'    => $session->fresh(['doctor.user']),
        ]);
    }

    /**
     * Delete (deactivate) a doctor session.
     */
    public function destroySession(int $id): JsonResponse
    {
        $session = DoctorSession::findOrFail($id);
        $session->update(['is_active' => false]);

        return response()->json([
            'success' => true,
            'message' => 'Session deactivated.',
        ]);
    }
}
