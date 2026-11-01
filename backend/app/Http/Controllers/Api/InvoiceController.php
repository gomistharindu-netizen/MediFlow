<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Visit;
use App\Services\BillingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InvoiceController extends Controller
{
    public function __construct(
        protected BillingService $billingService
    ) {}

    /**
     * List invoices for clinic cashier desk.
     */
    public function index(Request $request): JsonResponse
    {
        $status = $request->query('status');
        $date = $request->query('date', date('Y-m-d'));

        // Auto-generate invoices for any visits completed today that do not have an invoice record yet
        $unbilledVisits = Visit::whereDate('visit_date', $date)
            ->where('status', 'COMPLETED')
            ->whereDoesntHave('invoice')
            ->get();

        foreach ($unbilledVisits as $uv) {
            try {
                $this->billingService->generateOrGetInvoice($uv->id);
            } catch (\Exception $e) {
                \Log::warning("Could not auto-generate invoice for visit {$uv->id}: " . $e->getMessage());
            }
        }

        $query = Invoice::with(['patient', 'visit.patient', 'visit.doctor.user', 'visit.prescription.items', 'payments']);

        if ($status) {
            $query->where('status', $status);
        } else {
            // Default: Show today's invoices OR any active unpaid/partially paid invoices
            $query->where(function ($q) use ($date) {
                $q->whereDate('created_at', $date)
                  ->orWhereIn('status', ['UNPAID', 'PARTIALLY_PAID']);
            });
        }

        $invoices = $query->orderBy('created_at', 'desc')->get();

        return response()->json([
            'success' => true,
            'data' => $invoices,
        ]);
    }

    /**
     * Generate or compute bill for a specific visit.
     */
    public function getForVisit(Request $request, int $visitId): JsonResponse
    {
        try {
            $invoice = $this->billingService->generateOrGetInvoice($visitId);

            return response()->json([
                'success' => true,
                'data' => $invoice,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Settle payment for an invoice (Cash / Card / QR Pay).
     */
    public function settle(Request $request, int $invoiceId): JsonResponse
    {
        $validated = $request->validate([
            'payment_method' => 'required|in:CASH,CREDIT_CARD,BANK_TRANSFER,QR_PAY',
            'amount' => 'nullable|numeric|min:0.01',
            'charge_type' => 'nullable|in:CONSULTATION_ONLY,PHARMACY_ONLY,FULL_SETTLEMENT',
            'reference_note' => 'nullable|string',
        ]);

        try {
            $result = $this->billingService->settleInvoice($invoiceId, [
                'payment_method' => $validated['payment_method'],
                'amount' => $validated['amount'] ?? null,
                'charge_type' => $validated['charge_type'] ?? 'FULL_SETTLEMENT',
                'reference_note' => $validated['reference_note'] ?? null,
                'cashier_id' => auth()->id() ?? 1,
            ]);

            // Audit Trail (PDPA & HIPAA Compliance)
            \App\Services\AuditLogService::log(
                action: 'SETTLED_INVOICE',
                resourceType: 'Invoice',
                resourceId: $invoiceId,
                patientId: $result['invoice']->patient?->patient_id,
                details: [
                    'amount_paid' => $result['payment']->amount,
                    'payment_method' => $validated['payment_method'],
                    'receipt_number' => $result['payment']->receipt_number,
                ]
            );

            return response()->json([
                'success' => true,
                'message' => "Payment of LKR {$result['payment']->amount} recorded successfully. Receipt #{$result['payment']->receipt_number}",
                'data' => $result,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Get day-end cashier financial reconciliation report.
     */
    public function reconciliation(Request $request): JsonResponse
    {
        $date = $request->query('date', date('Y-m-d'));
        $report = $this->billingService->getDayEndReconciliation($date);

        return response()->json([
            'success' => true,
            'data' => $report,
        ]);
    }
}
