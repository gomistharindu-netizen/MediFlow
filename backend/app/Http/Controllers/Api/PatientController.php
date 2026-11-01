<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Patient;
use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PatientController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Patient::with(['todayVisit.doctor.user']);

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('patient_id', 'LIKE', "%{$search}%")
                  ->orWhere('phone', 'LIKE', "%{$search}%")
                  ->orWhere('first_name', 'LIKE', "%{$search}%")
                  ->orWhere('last_name', 'LIKE', "%{$search}%")
                  ->orWhere('nic', 'LIKE', "%{$search}%");
            });
        }

        if ($request->boolean('today_only')) {
            $query->whereHas('todayVisit');
        }

        $patients = $query->orderBy('created_at', 'desc')->paginate(50);

        return response()->json([
            'success' => true,
            'data' => $patients,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'first_name' => 'required|string|max:100',
            'last_name' => 'nullable|string|max:100',
            'nic' => 'nullable|string|max:20',
            'phone' => 'required|string|max:20',
            'date_of_birth' => 'nullable|date',
            'gender' => 'required|in:male,female,other',
            'address' => 'nullable|string',
            'allergies' => 'nullable|array',
            'chronic_conditions' => 'nullable|array',
            'guardian_name' => 'nullable|string|max:100',
            'guardian_relation' => 'nullable|string|max:50',
            'emergency_phone' => 'nullable|string|max:20',
            'notes' => 'nullable|string',
            'allow_duplicate' => 'sometimes|boolean',
            'consent_given' => 'sometimes|boolean',
            'consent_method' => 'sometimes|string',
            'consent_language' => 'sometimes|string',
            'data_processing_notes' => 'nullable|string',
        ]);

        // Duplicate Check: Same phone + first_name + date_of_birth
        if (empty($validated['allow_duplicate'])) {
            $existing = Patient::where('phone', $validated['phone'])
                ->where('first_name', $validated['first_name'])
                ->first();

            if ($existing) {
                return response()->json([
                    'success' => false,
                    'is_duplicate' => true,
                    'existing_patient' => $existing,
                    'message' => "A patient named '{$existing->full_name}' with phone {$existing->phone} already exists (ID: {$existing->patient_id}).",
                ], 409);
            }
        }

        $validated['patient_id'] = Patient::generatePatientId();
        if (!isset($validated['consent_given']) || $validated['consent_given']) {
            $validated['consent_given'] = true;
            $validated['consent_timestamp'] = now();
        }

        $patient = Patient::create($validated);

        // Audit Trail (PDPA & HIPAA Compliance)
        AuditLogService::log(
            action: 'REGISTERED_PATIENT',
            resourceType: 'Patient',
            resourceId: $patient->id,
            patientId: $patient->patient_id,
            details: [
                'patient_name' => $patient->full_name,
                'phone' => $patient->phone,
                'consent_given' => $patient->consent_given,
                'consent_method' => $patient->consent_method,
            ]
        );

        return response()->json([
            'success' => true,
            'message' => 'Patient registered successfully',
            'data' => $patient,
        ], 201);
    }

    public function show(int $id): JsonResponse
    {
        $patient = Patient::with(['visits.doctor.user', 'visits.prescription.items', 'visits.labReports'])
            ->findOrFail($id);

        // Audit Trail (PDPA & HIPAA Compliance)
        AuditLogService::log(
            action: 'VIEWED_PATIENT_CHART',
            resourceType: 'Patient',
            resourceId: $patient->id,
            patientId: $patient->patient_id,
            details: ['patient_name' => $patient->full_name]
        );

        // Least-Privilege Data Masking (Receptionist cannot view private doctor diagnosis)
        $user = auth()->user();
        if ($user && method_exists($user, 'hasRole') && $user->hasRole('Receptionist')) {
            $patient->visits->each(function ($visit) {
                unset($visit->doctor_private_notes);
                unset($visit->clinical_notes);
                unset($visit->diagnosis);
            });
        }

        return response()->json([
            'success' => true,
            'data' => $patient,
        ]);
    }
}
