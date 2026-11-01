<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Visit;
use App\Models\ClinicSetting;
use Illuminate\Support\Facades\DB;
use Exception;

class BillingService
{
    /**
     * Compute and retrieve the invoice for a patient visit adhering to clinic payment timing mode.
     */
    public function generateOrGetInvoice(int $visitId): Invoice
    {
        $visit = Visit::with(['patient', 'doctor', 'prescription.items', 'invoice.payments'])->findOrFail($visitId);
        $timingMode = ClinicSetting::get('consultation_payment_timing', 'AFTER');

        $consultationFee = (float) ($visit->doctor?->consultation_fee ?? 1500.00);
        $pharmacyFee = 0.00;

        if ($visit->prescription && $visit->prescription->dispense_status !== 'EXTERNAL') {
            $pharmacyFee = (float) $visit->prescription->items->sum('total_price');
        }

        // If Pay-Before mode and visit is not yet completed/dispensed, pharmacy fee is not charged yet
        if ($timingMode === 'BEFORE' && in_array($visit->status, ['NOT_CHECKED_IN', 'WAITING', 'CALLED'])) {
            $pharmacyFee = 0.00;
        }

        $totalAmount = $consultationFee + $pharmacyFee;

        // If an invoice already exists for this visit
        if ($visit->invoice) {
            $invoice = $visit->invoice;
            
            // If invoice is already fully settled, return as is
            if ($invoice->status === 'PAID') {
                return $invoice;
            }

            // Update with latest computed amounts
            $invoice->update([
                'consultation_fee' => $consultationFee,
                'pharmacy_fee' => $pharmacyFee,
                'total_amount' => $totalAmount,
                'balance_due' => max(0, $totalAmount - (float) $invoice->paid_amount),
            ]);

            return $invoice->fresh(['payments', 'patient', 'visit.doctor.user', 'visit.prescription.items']);
        }

        // Otherwise generate a new invoice
        $invoice = Invoice::create([
            'invoice_number' => Invoice::generateInvoiceNumber(),
            'visit_id' => $visit->id,
            'patient_id' => $visit->patient_id,
            'consultation_fee' => $consultationFee,
            'pharmacy_fee' => $pharmacyFee,
            'other_procedures_fee' => 0.00,
            'discount_amount' => 0.00,
            'total_amount' => $totalAmount,
            'paid_amount' => 0.00,
            'balance_due' => $totalAmount,
            'status' => 'UNPAID',
        ]);

        return $invoice->fresh(['payments', 'patient', 'visit.doctor.user', 'visit.prescription.items']);
    }

    /**
     * Settle invoice with cash, card, or QR payment.
     */
    public function settleInvoice(int $invoiceId, array $data): array
    {
        $invoice = Invoice::with(['visit', 'patient'])->findOrFail($invoiceId);

        $amountToPay = isset($data['amount']) ? (float) $data['amount'] : (float) $invoice->balance_due;
        $paymentMethod = $data['payment_method'] ?? 'CASH';
        $cashierId = $data['cashier_id'] ?? auth()->id() ?? 1;

        if ($amountToPay <= 0) {
            throw new Exception("Payment amount must be greater than 0.");
        }

        $payment = null;

        DB::transaction(function () use ($invoice, $amountToPay, $paymentMethod, $cashierId, $data, &$payment) {
            $payment = Payment::create([
                'invoice_id' => $invoice->id,
                'receipt_number' => Payment::generateReceiptNumber(),
                'amount' => $amountToPay,
                'payment_method' => $paymentMethod,
                'charge_type' => $data['charge_type'] ?? 'FULL_SETTLEMENT',
                'cashier_id' => $cashierId,
                'reference_note' => $data['reference_note'] ?? null,
            ]);

            $newPaid = (float) $invoice->paid_amount + $amountToPay;
            $newBalance = max(0, (float) $invoice->total_amount - $newPaid);

            $invoice->update([
                'paid_amount' => $newPaid,
                'balance_due' => $newBalance,
                'status' => $newBalance <= 0.01 ? 'PAID' : 'PARTIALLY_PAID',
            ]);
        });

        return [
            'payment' => $payment,
            'invoice' => $invoice->fresh(['payments', 'patient', 'visit.doctor.user']),
        ];
    }

    /**
     * Compute day-end cashier financial reconciliation breakdown.
     */
    public function getDayEndReconciliation(?string $date = null): array
    {
        $reportDate = $date ?: date('Y-m-d');

        $payments = Payment::with(['invoice.patient', 'invoice.visit.doctor.user', 'cashier'])
            ->whereDate('created_at', $reportDate)
            ->get();

        $totalCollected = (float) $payments->sum('amount');
        $cashTotal = (float) $payments->where('payment_method', 'CASH')->sum('amount');
        $cardTotal = (float) $payments->where('payment_method', 'CREDIT_CARD')->sum('amount');
        $qrTotal = (float) $payments->where('payment_method', 'QR_PAY')->sum('amount');
        $bankTotal = (float) $payments->where('payment_method', 'BANK_TRANSFER')->sum('amount');

        // Invoice stats
        $invoices = Invoice::whereDate('created_at', $reportDate)->get();

        return [
            'date' => $reportDate,
            'total_collected' => $totalCollected,
            'payment_breakdown' => [
                'cash' => $cashTotal,
                'card' => $cardTotal,
                'qr_pay' => $qrTotal,
                'bank_transfer' => $bankTotal,
            ],
            'invoices_summary' => [
                'total_generated' => $invoices->count(),
                'fully_paid' => $invoices->where('status', 'PAID')->count(),
                'unpaid' => $invoices->where('status', 'UNPAID')->count(),
                'partially_paid' => $invoices->where('status', 'PARTIALLY_PAID')->count(),
            ],
            'transactions' => $payments->map(function ($p) {
                return [
                    'id' => $p->id,
                    'receipt_number' => $p->receipt_number,
                    'invoice_number' => $p->invoice?->invoice_number,
                    'patient_name' => $p->invoice?->patient?->full_name,
                    'amount' => (float) $p->amount,
                    'payment_method' => $p->payment_method,
                    'charge_type' => $p->charge_type,
                    'cashier_name' => $p->cashier?->name ?? 'Cashier',
                    'time' => $p->created_at->format('H:i A'),
                ];
            }),
        ];
    }
}
