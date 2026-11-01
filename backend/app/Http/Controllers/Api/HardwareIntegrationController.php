<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\SmsLog;
use App\Models\Visit;
use App\Services\ThermalPrinterService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HardwareIntegrationController extends Controller
{
    public function __construct(
        protected ThermalPrinterService $thermalPrinter
    ) {}

    /**
     * Generate thermal ESC/POS token slip.
     */
    public function printTokenSlip(Request $request, int $visitId): JsonResponse
    {
        $visit = Visit::with(['patient', 'doctor.user'])->findOrFail($visitId);
        $width = $request->query('width'); // '80mm' or '58mm'

        $payload = $this->thermalPrinter->generateTokenSlip($visit, $width);

        return response()->json([
            'success' => true,
            'data' => $payload,
        ]);
    }

    /**
     * Generate thermal ESC/POS payment receipt slip.
     */
    public function printReceiptSlip(Request $request, int $paymentId): JsonResponse
    {
        $payment = Payment::with(['invoice.patient', 'invoice.visit', 'cashier'])->findOrFail($paymentId);
        $width = $request->query('width');

        $payload = $this->thermalPrinter->generateReceiptSlip($payment, $width);

        return response()->json([
            'success' => true,
            'data' => $payload,
        ]);
    }

    /**
     * List recent SMS dispatch logs for clinic.
     */
    public function smsLogs(Request $request): JsonResponse
    {
        $logs = SmsLog::with(['patient', 'visit'])
            ->orderBy('created_at', 'desc')
            ->limit(50)
            ->get();

        return response()->json([
            'success' => true,
            'data' => $logs,
        ]);
    }
}
