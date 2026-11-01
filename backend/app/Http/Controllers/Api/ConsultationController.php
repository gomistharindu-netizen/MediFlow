<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Visit;
use App\Models\Patient;
use App\Models\Prescription;
use App\Models\PrescriptionItem;
use App\Services\QueueManagerService;
use App\Services\BillingService;
use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class ConsultationController extends Controller
{
    public function __construct(
        protected QueueManagerService $queueService,
        protected BillingService $billingService
    ) {}

    /**
     * Get full visit details for active consultation workspace.
     */
    public function getVisitDetails(int $visitId): JsonResponse
    {
        $visit = Visit::with([
            'patient',
            'doctor.user',
            'prescription.items',
            'labReports',
        ])->findOrFail($visitId);

        // Audit Trail (PDPA & HIPAA Compliance)
        AuditLogService::log(
            action: 'VIEWED_CONSULTATION_CHART',
            resourceType: 'Visit',
            resourceId: $visitId,
            patientId: $visit->patient?->patient_id,
            details: ['token_number' => $visit->token_number, 'patient_name' => $visit->patient?->full_name]
        );

        return response()->json([
            'success' => true,
            'data' => $visit,
        ]);
    }

    /**
     * Get patient past medical history, past diagnoses, treatments & lab records.
     */
    public function getPatientHistory(int $patientId): JsonResponse
    {
        $patient = Patient::findOrFail($patientId);

        $pastVisits = Visit::with([
            'doctor.user',
            'prescription.items',
            'labReports',
        ])
        ->where('patient_id', $patientId)
        ->where('status', 'COMPLETED')
        ->orderBy('visit_date', 'desc')
        ->get();

        // Audit Trail (PDPA & HIPAA Compliance)
        AuditLogService::log(
            action: 'VIEWED_PATIENT_HISTORY',
            resourceType: 'Patient',
            resourceId: $patientId,
            patientId: $patient->patient_id,
            details: ['patient_name' => $patient->full_name, 'past_visits_reviewed' => $pastVisits->count()]
        );

        return response()->json([
            'success' => true,
            'data' => [
                'patient' => $patient,
                'past_visits' => $pastVisits,
                'total_past_visits' => $pastVisits->count(),
            ],
        ]);
    }

    /**
     * Complete consultation with vitals, clinical notes, diagnosis, and prescription items.
     * Enforces the critical Drug Allergy Safety Guard.
     */
    public function submitConsultation(Request $request, int $visitId): JsonResponse
    {
        $visit = Visit::with(['patient', 'doctor'])->findOrFail($visitId);

        $validated = $request->validate([
            'vitals' => 'nullable|array',
            'chief_complaint' => 'nullable|string',
            'diagnosis' => 'required|string|min:2',
            'clinical_notes' => 'nullable|string',
            'doctor_private_notes' => 'nullable|string',
            'prescriptions' => 'nullable|array',
            'prescriptions.*.medicine_id' => 'nullable|integer',
            'prescriptions.*.medicine_name' => 'required|string',
            'prescriptions.*.dosage' => 'required|string',
            'prescriptions.*.frequency' => 'required|string',
            'prescriptions.*.duration' => 'required|string',
            'prescriptions.*.instructions' => 'nullable|string',
            'prescriptions.*.quantity' => 'required|integer|min:1',
            'general_instructions' => 'nullable|string',
            'prescription_destination' => 'nullable|string|in:IN_HOUSE,EXTERNAL',
            'follow_up_date' => 'nullable|date',
            'allergy_override' => 'nullable|boolean',
            'allergy_override_reason' => 'nullable|string',
        ]);

        // CRITICAL ALLERGY SAFETY GUARD
        $patientAllergies = $visit->patient->allergies ?: [];
        $prescribedDrugs = $validated['prescriptions'] ?? [];
        $isOverridden = $request->boolean('allergy_override');

        if (!empty($patientAllergies) && !empty($prescribedDrugs) && !$isOverridden) {
            foreach ($patientAllergies as $allergy) {
                $allergyNorm = strtolower(trim($allergy));

                foreach ($prescribedDrugs as $drug) {
                    $drugNorm = strtolower($drug['medicine_name']);

                    // Penicillin Group check
                    if (str_contains($allergyNorm, 'penicillin')) {
                        if (
                            str_contains($drugNorm, 'amoxicillin') ||
                            str_contains($drugNorm, 'amoxil') ||
                            str_contains($drugNorm, 'augmentin') ||
                            str_contains($drugNorm, 'penicillin') ||
                            str_contains($drugNorm, 'ampicillin') ||
                            str_contains($drugNorm, 'cloxacillin')
                        ) {
                            return response()->json([
                                'success' => false,
                                'error_code' => 'ALLERGY_CONTRAINDICATION',
                                'message' => "CRITICAL ALLERGY CONFLICT: Patient has documented allergy to '{$allergy}'. Prescribed drug '{$drug['medicine_name']}' is strictly contraindicated.",
                                'conflict' => [
                                    'drug' => $drug['medicine_name'],
                                    'allergy' => $allergy,
                                ],
                            ], 422);
                        }
                    }

                    // Sulfa Group check
                    if (str_contains($allergyNorm, 'sulfa')) {
                        if (
                            str_contains($drugNorm, 'bactrim') ||
                            str_contains($drugNorm, 'cotrimoxazole') ||
                            str_contains($drugNorm, 'sulfamethoxazole') ||
                            str_contains($drugNorm, 'sulfa')
                        ) {
                            return response()->json([
                                'success' => false,
                                'error_code' => 'ALLERGY_CONTRAINDICATION',
                                'message' => "CRITICAL ALLERGY CONFLICT: Patient has documented allergy to '{$allergy}'. Prescribed drug '{$drug['medicine_name']}' contains sulfonamide.",
                                'conflict' => [
                                    'drug' => $drug['medicine_name'],
                                    'allergy' => $allergy,
                                ],
                            ], 422);
                        }
                    }

                    // NSAID / Aspirin Group check
                    if (str_contains($allergyNorm, 'aspirin') || str_contains($allergyNorm, 'nsaid')) {
                        if (
                            str_contains($drugNorm, 'aspirin') ||
                            str_contains($drugNorm, 'ibuprofen') ||
                            str_contains($drugNorm, 'diclofenac') ||
                            str_contains($drugNorm, 'mefenamic')
                        ) {
                            return response()->json([
                                'success' => false,
                                'error_code' => 'ALLERGY_CONTRAINDICATION',
                                'message' => "CRITICAL ALLERGY CONFLICT: Patient has documented allergy to '{$allergy}'. Prescribed drug '{$drug['medicine_name']}' is an NSAID.",
                                'conflict' => [
                                    'drug' => $drug['medicine_name'],
                                    'allergy' => $allergy,
                                ],
                            ], 422);
                        }
                    }
                }
            }
        }

        // 1. Update Consultation Visit Details & Complete
        $visit->update([
            'vitals' => $validated['vitals'] ?? $visit->vitals,
            'chief_complaint' => $validated['chief_complaint'] ?? $visit->chief_complaint,
            'diagnosis' => $validated['diagnosis'],
            'clinical_notes' => $validated['clinical_notes'] ?? $visit->clinical_notes,
            'doctor_private_notes' => $validated['doctor_private_notes'] ?? $visit->doctor_private_notes,
            'status' => 'COMPLETED',
            'completed_at' => now(),
        ]);

        // 2. Create / Update Prescription
        $prescription = null;
        if (!empty($prescribedDrugs)) {
            $isExternalDestination = ($request->input('prescription_destination') === 'EXTERNAL');

            $prescription = Prescription::updateOrCreate(
                ['visit_id' => $visit->id],
                [
                    'patient_id' => $visit->patient_id,
                    'doctor_id' => $visit->doctor_id,
                    'dispense_status' => $isExternalDestination ? 'EXTERNAL' : 'PENDING',
                    'general_instructions' => $validated['general_instructions'] ?? null,
                    'follow_up_date' => $validated['follow_up_date'] ?? null,
                ]
            );

            // Replace prescription items
            $prescription->items()->delete();

            foreach ($prescribedDrugs as $item) {
                $medicineId = $item['medicine_id'] ?? null;
                $unitPrice = 0.00;

                $medicine = null;
                if ($medicineId) {
                    $medicine = \App\Models\Medicine::with('usableBatches')->find($medicineId);
                }
                if (!$medicine) {
                    $nameSearch = strtok($item['medicine_name'], ' (');
                    $medicine = \App\Models\Medicine::with('usableBatches')
                        ->where('name', 'LIKE', "%{$nameSearch}%")
                        ->orWhere('generic_name', 'LIKE', "%{$nameSearch}%")
                        ->first();
                }

                if ($medicine) {
                    $medicineId = $medicine->id;
                    if (!$isExternalDestination) {
                        $earliestBatch = $medicine->usableBatches->first();
                        if ($earliestBatch) {
                            $unitPrice = (float) $earliestBatch->selling_unit_price;
                        } else {
                            $latestBatch = \App\Models\MedicineBatch::where('medicine_id', $medicine->id)->latest('id')->first();
                            $unitPrice = $latestBatch ? (float) $latestBatch->selling_unit_price : 10.00;
                        }
                    }
                } else {
                    $unitPrice = $isExternalDestination ? 0.00 : 10.00;
                }

                $totalPrice = $unitPrice * (int) $item['quantity'];

                PrescriptionItem::create([
                    'prescription_id' => $prescription->id,
                    'medicine_id' => $medicineId,
                    'medicine_name' => $item['medicine_name'],
                    'dosage' => $item['dosage'],
                    'frequency' => $item['frequency'],
                    'duration' => $item['duration'],
                    'instructions' => $item['instructions'] ?? null,
                    'quantity_prescribed' => $item['quantity'],
                    'quantity_dispensed' => 0,
                    'unit_price' => $unitPrice,
                    'total_price' => $totalPrice,
                ]);
            }

            $prescription->load('items');
        }

        // 3. Auto-Generate / Update Bill Invoice for Cashier Desk
        $invoice = null;
        try {
            $invoice = $this->billingService->generateOrGetInvoice($visit->id);
        } catch (\Exception $e) {
            \Log::warning("Could not auto-generate invoice for visit {$visit->id}: " . $e->getMessage());
        }

        // 4. Trigger WebSocket Broadcast
        $this->queueService->broadcastQueueChange($visit->doctor_id, 'completed', $visit);

        // Audit Trail (PDPA & HIPAA Compliance)
        AuditLogService::log(
            action: 'COMPLETED_CONSULTATION',
            resourceType: 'Visit',
            resourceId: $visit->id,
            patientId: $visit->patient?->patient_id,
            details: [
                'token_number' => $visit->token_number,
                'diagnosis' => $validated['diagnosis'],
                'prescriptions_count' => count($validated['prescriptions'] ?? []),
                'allergy_override' => $isOverridden,
            ]
        );

        return response()->json([
            'success' => true,
            'message' => "Consultation completed and prescription dispatched for Token #{$visit->token_number}",
            'data' => [
                'visit' => $visit->fresh(['patient', 'prescription.items']),
                'prescription' => $prescription,
            ],
        ]);
    }
}
