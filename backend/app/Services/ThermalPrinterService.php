<?php

namespace App\Services;

use App\Models\ClinicSetting;
use App\Models\Payment;
use App\Models\Prescription;
use App\Models\Visit;

class ThermalPrinterService
{
    // ESC/POS Command Constants
    public const ESC = "\x1B";
    public const GS = "\x1D";
    public const INIT = "\x1B\x40";           // ESC @ Initialize printer
    public const ALIGN_LEFT = "\x1B\x61\x00";  // ESC a 0 Left justify
    public const ALIGN_CENTER = "\x1B\x61\x01";// ESC a 1 Center justify
    public const ALIGN_RIGHT = "\x1B\x61\x02"; // ESC a 2 Right justify
    public const BOLD_ON = "\x1B\x45\x01";     // ESC E 1 Bold font on
    public const BOLD_OFF = "\x1B\x45\x00";    // ESC E 0 Bold font off
    public const DOUBLE_SIZE = "\x1D\x21\x11"; // GS ! 17 Double width & height
    public const NORMAL_SIZE = "\x1D\x21\x00"; // GS ! 0 Normal text
    public const CUT_PAPER = "\x1D\x56\x42\x00"; // GS V 66 0 Feed & cut

    /**
     * Get maximum character width per line based on paper width.
     */
    public function getLineCharacters(string $width = '80mm'): int
    {
        return $width === '58mm' ? 32 : 48;
    }

    /**
     * Generate thermal queue token slip.
     */
    public function generateTokenSlip(Visit $visit, ?string $width = null): array
    {
        $settingsWidth = ClinicSetting::get('thermal_printer_width', '80mm');
        $width = $width ?? $settingsWidth;
        $maxChars = $this->getLineCharacters($width);

        $branding = ClinicSetting::get('clinic_branding', []);
        $clinicName = strtoupper($branding['clinic_name'] ?? 'MEDIFLOW CLINIC');
        $address = $branding['address'] ?? 'Colombo, Sri Lanka';
        $phone = $branding['phone'] ?? '+94 11 234 5678';

        $divider = str_repeat('-', $maxChars);
        $doubleDivider = str_repeat('=', $maxChars);

        $doctorName = $visit->doctor?->user?->name ?? 'Consultant';
        $patientName = $visit->patient?->full_name ?? 'Patient';

        $lines = [];
        $lines[] = self::INIT;
        $lines[] = self::ALIGN_CENTER . self::BOLD_ON . $clinicName . self::BOLD_OFF;
        $lines[] = self::ALIGN_CENTER . $address;
        $lines[] = self::ALIGN_CENTER . "Tel: {$phone}";
        $lines[] = self::ALIGN_CENTER . $doubleDivider;
        $lines[] = self::ALIGN_CENTER . "YOUR QUEUE TOKEN NUMBER";
        $lines[] = self::ALIGN_CENTER . self::DOUBLE_SIZE . self::BOLD_ON . "#{$visit->token_number}" . self::NORMAL_SIZE . self::BOLD_OFF;
        $lines[] = self::ALIGN_CENTER . "Room: " . ($visit->room_number ?? 'Room 1');
        $lines[] = self::ALIGN_CENTER . $divider;
        $lines[] = self::ALIGN_LEFT . "Doctor : Dr. {$doctorName}";
        $lines[] = self::ALIGN_LEFT . "Patient: {$patientName} ({$visit->patient?->age}Y/{$visit->patient?->gender})";
        $lines[] = self::ALIGN_LEFT . "Date   : " . now()->format('Y-m-d H:i A');
        $lines[] = self::ALIGN_CENTER . $divider;
        $lines[] = self::ALIGN_CENTER . "Live Tracker: http://localhost:3005/q/{$visit->token_number}";
        $lines[] = self::ALIGN_CENTER . "*** Please listen for chime on TV ***\n\n";
        $lines[] = self::CUT_PAPER;

        return [
            'width' => $width,
            'plain_text' => strip_tags(implode("\n", array_map(fn($l) => preg_replace('/[\x00-\x1F\x7F]/', '', $l), $lines))),
            'esc_pos_hex' => bin2hex(implode("\n", $lines)),
        ];
    }

    /**
     * Generate thermal payment receipt.
     */
    public function generateReceiptSlip(Payment $payment, ?string $width = null): array
    {
        $settingsWidth = ClinicSetting::get('thermal_printer_width', '80mm');
        $width = $width ?? $settingsWidth;
        $maxChars = $this->getLineCharacters($width);

        $branding = ClinicSetting::get('clinic_branding', []);
        $clinicName = strtoupper($branding['clinic_name'] ?? 'MEDIFLOW CLINIC');
        $address = $branding['address'] ?? 'Colombo, Sri Lanka';
        $phone = $branding['phone'] ?? '+94 11 234 5678';

        $divider = str_repeat('-', $maxChars);
        $doubleDivider = str_repeat('=', $maxChars);

        $invoice = $payment->invoice;
        $patient = $invoice?->patient;
        $visit = $invoice?->visit;

        $lines = [];
        $lines[] = self::INIT;
        $lines[] = self::ALIGN_CENTER . self::BOLD_ON . $clinicName . self::BOLD_OFF;
        $lines[] = self::ALIGN_CENTER . $address;
        $lines[] = self::ALIGN_CENTER . "Tel: {$phone}";
        $lines[] = self::ALIGN_CENTER . $doubleDivider;
        $lines[] = self::ALIGN_CENTER . self::BOLD_ON . "OFFICIAL PAYMENT RECEIPT" . self::BOLD_OFF;
        $lines[] = self::ALIGN_CENTER . "Receipt #: {$payment->receipt_number}";
        $lines[] = self::ALIGN_CENTER . "Invoice #: {$invoice?->invoice_number}";
        $lines[] = self::ALIGN_CENTER . "Token   : #" . ($visit?->token_number ?? '—');
        $lines[] = self::ALIGN_CENTER . $divider;
        $lines[] = self::ALIGN_LEFT . "Patient : {$patient?->full_name}";
        $lines[] = self::ALIGN_LEFT . "Date/Time: " . $payment->created_at->format('Y-m-d H:i A');
        $lines[] = self::ALIGN_LEFT . "Cashier : " . ($payment->cashier?->name ?? 'Cashier Desk');
        $lines[] = self::ALIGN_CENTER . $divider;

        // Line Items
        if ((float) $invoice?->consultation_fee > 0) {
            $lines[] = self::ALIGN_LEFT . $this->formatRow("Doctor Consultation Fee", "LKR " . number_format((float)$invoice->consultation_fee, 2), $maxChars);
        }
        if ((float) $invoice?->pharmacy_fee > 0) {
            $lines[] = self::ALIGN_LEFT . $this->formatRow("In-house Pharmacy (FIFO)", "LKR " . number_format((float)$invoice->pharmacy_fee, 2), $maxChars);
        }
        if ((float) $invoice?->discount_amount > 0) {
            $lines[] = self::ALIGN_LEFT . $this->formatRow("Clinic Discount", "- LKR " . number_format((float)$invoice->discount_amount, 2), $maxChars);
        }

        $lines[] = self::ALIGN_CENTER . $doubleDivider;
        $lines[] = self::ALIGN_LEFT . self::BOLD_ON . $this->formatRow("AMOUNT PAID ({$payment->payment_method}):", "LKR " . number_format((float)$payment->amount, 2), $maxChars) . self::BOLD_OFF;
        $lines[] = self::ALIGN_LEFT . $this->formatRow("Remaining Balance Due:", "LKR " . number_format((float)($invoice?->balance_due ?? 0), 2), $maxChars);
        $lines[] = self::ALIGN_CENTER . $divider;
        $lines[] = self::ALIGN_CENTER . "Thank you for visiting {$clinicName}!";
        $lines[] = self::ALIGN_CENTER . "MediFlow Audit Verified\n\n";
        $lines[] = self::CUT_PAPER;

        return [
            'width' => $width,
            'plain_text' => strip_tags(implode("\n", array_map(fn($l) => preg_replace('/[\x00-\x1F\x7F]/', '', $l), $lines))),
            'esc_pos_hex' => bin2hex(implode("\n", $lines)),
        ];
    }

    /**
     * Format a key-value row padded to printer width.
     */
    protected function formatRow(string $left, string $right, int $maxChars): string
    {
        $spacesNeeded = max(1, $maxChars - mb_strlen($left) - mb_strlen($right));
        return $left . str_repeat(' ', $spacesNeeded) . $right;
    }
}
