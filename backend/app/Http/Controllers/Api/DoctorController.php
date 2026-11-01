<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Doctor;
use App\Models\DoctorSession;
use Illuminate\Http\JsonResponse;

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
}
