<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Doctor;
use App\Models\DoctorSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DoctorController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $date = $request->query('date', date('Y-m-d'));

        $doctors = Doctor::with(['user', 'sessions' => function ($q) use ($date) {
            $q->where('is_active', true)
              ->withCount(['visits as booked_count' => function ($vq) use ($date) {
                  $vq->whereDate('visit_date', $date)
                     ->where('status', '!=', 'CANCELLED');
              }]);
        }])
        ->where('is_active', true)
        ->get();

        return response()->json([
            'success' => true,
            'data' => $doctors,
        ]);
    }

    public function sessions(Request $request): JsonResponse
    {
        $date = $request->query('date', date('Y-m-d'));
        $doctorId = $request->query('doctor_id');

        $query = DoctorSession::with('doctor.user')
            ->where('is_active', true)
            ->withCount(['visits as booked_count' => function ($q) use ($date) {
                $q->whereDate('visit_date', $date)
                  ->where('status', '!=', 'CANCELLED');
            }]);

        if ($doctorId) {
            $query->where('doctor_id', $doctorId);
        }

        $sessions = $query->get()->map(function ($s) {
            $s->available_slots = max(0, $s->max_patients - $s->booked_count);
            $s->is_full = $s->booked_count >= $s->max_patients;
            return $s;
        });

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
            'day_of_week'   => 'required|string|in:monday,tuesday,wednesday,thursday,friday,saturday,sunday,Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday',
            'start_time'    => 'required|date_format:H:i',
            'end_time'      => 'required|date_format:H:i|after:start_time',
            'max_patients'  => 'required|integer|min:1|max:200',
            'is_active'     => 'sometimes|boolean',
        ]);

        $validated['day_of_week'] = strtolower($validated['day_of_week']);

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
            'day_of_week'   => 'sometimes|string|in:monday,tuesday,wednesday,thursday,friday,saturday,sunday,Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday',
            'start_time'    => 'sometimes|date_format:H:i',
            'end_time'      => 'sometimes|date_format:H:i',
            'max_patients'  => 'sometimes|integer|min:1|max:200',
            'is_active'     => 'sometimes|boolean',
        ]);

        if (isset($validated['day_of_week'])) {
            $validated['day_of_week'] = strtolower($validated['day_of_week']);
        }

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
