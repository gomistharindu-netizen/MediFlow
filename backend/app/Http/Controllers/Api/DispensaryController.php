<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Prescription;
use App\Services\FifoStockService;
use App\Services\BillingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DispensaryController extends Controller
{
    public function __construct(
        protected FifoStockService $fifoService,
        protected BillingService $billingService
    ) {}

    /**
     * Get pending prescriptions awaiting pharmacy dispensing.
     */
    public function pendingPrescriptions(Request $request): JsonResponse
    {
        $prescriptions = Prescription::with([
            'visit.patient',
            'doctor.user',
            'items.medicine.usableBatches',
        ])
        ->whereIn('dispense_status', ['PENDING', 'PARTIALLY_DISPENSED'])
        ->orderBy('created_at', 'asc')
        ->get();

        return response()->json([
            'success' => true,
            'data' => $prescriptions,
        ]);
    }

    /**
     * Execute FIFO earliest-expiry batch dispensing for a prescription.
     */
    public function dispense(Request $request, int $prescriptionId): JsonResponse
    {
        try {
            $prescription = $this->fifoService->dispensePrescription($prescriptionId);

            // Automatically update billing invoice with dispensed medicine prices
            if ($prescription->visit_id) {
                try {
                    $this->billingService->generateOrGetInvoice($prescription->visit_id);
                } catch (\Exception $e) {
                    \Log::warning("Could not update invoice after prescription dispense: " . $e->getMessage());
                }
            }

            // Audit Trail (PDPA & HIPAA Compliance)
            \App\Services\AuditLogService::log(
                action: 'DISPENSED_PRESCRIPTION',
                resourceType: 'Prescription',
                resourceId: $prescriptionId,
                patientId: $prescription->visit?->patient?->patient_id,
                details: [
                    'prescription_id' => $prescriptionId,
                    'patient_name' => $prescription->visit?->patient?->full_name,
                    'token_number' => $prescription->visit?->token_number,
                ]
            );

            return response()->json([
                'success' => true,
                'message' => 'Prescription dispensed successfully with FIFO earliest-expiry stock deduction.',
                'data' => $prescription,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Get expiring and low-stock inventory alerts.
     */
    public function inventoryAlerts(Request $request): JsonResponse
    {
        $days = (int) $request->query('days', 90);
        $alerts = $this->fifoService->getInventoryAlerts($days);

        return response()->json([
            'success' => true,
            'data' => $alerts,
        ]);
    }

    /**
     * Mark a prescription as EXTERNAL (patient buys medicine outside).
     * Reverses FIFO stock deduction if already dispensed, and zeroes pharmacy fee on Cashier invoice.
     */
    public function markExternal(Request $request, int $prescriptionId): JsonResponse
    {
        try {
            $prescription = $this->fifoService->markPrescriptionAsExternal($prescriptionId);

            $invoice = null;
            if ($prescription->visit_id) {
                try {
                    $invoice = $this->billingService->generateOrGetInvoice($prescription->visit_id);
                } catch (\Exception $e) {
                    \Log::warning("Could not update invoice after prescription mark external: " . $e->getMessage());
                }
            }

            // Audit Trail
            \App\Services\AuditLogService::log(
                action: 'MARKED_PRESCRIPTION_EXTERNAL',
                resourceType: 'Prescription',
                resourceId: $prescriptionId,
                patientId: $prescription->visit?->patient?->patient_id,
                details: [
                    'prescription_id' => $prescriptionId,
                    'patient_name' => $prescription->visit?->patient?->full_name,
                    'token_number' => $prescription->visit?->token_number,
                    'reason' => 'Patient buying medicines outside pharmacy',
                ]
            );

            return response()->json([
                'success' => true,
                'message' => 'Prescription marked as External. In-house stock is intact and cashier invoice updated to Consultation fee only.',
                'data' => [
                    'prescription' => $prescription,
                    'invoice' => $invoice,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Mark prescription as external using visit ID (for Cashier desk convenience).
     */
    public function markExternalByVisit(Request $request, int $visitId): JsonResponse
    {
        $visit = \App\Models\Visit::with('prescription')->findOrFail($visitId);

        if (!$visit->prescription) {
            return response()->json([
                'success' => false,
                'message' => 'No prescription found for this visit.',
            ], 404);
        }

        return $this->markExternal($request, $visit->prescription->id);
    }
}
