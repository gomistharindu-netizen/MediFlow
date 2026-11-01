<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ClinicSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClinicSettingsController extends Controller
{
    public function index(): JsonResponse
    {
        $settings = ClinicSetting::all()->pluck('value', 'key')->toArray();

        // Ensure default fallbacks if missing
        $defaults = [
            'consultation_payment_timing' => 'AFTER',
            'pharmacy_enabled' => true,
            'queue_late_arrival_policy' => 'FAIR_16_24',
            'queue_missed_recall_penalty' => 'END_OF_WAITING',
            'sms_enabled' => true,
            'sms_gateway_provider' => 'mock',
            'sms_sender_mask' => 'MEDIFLOW',
            'turn_alert_threshold' => 3,
            'thermal_printer_width' => '80mm',
            'clinic_branding' => [
                'clinic_name' => 'MediFlow Medical Practice',
                'tagline' => 'Quality Patient Care',
            ],
        ];

        $merged = array_merge($defaults, $settings);

        return response()->json([
            'success' => true,
            'tenant' => tenant('id'),
            'settings' => $merged,
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'consultation_payment_timing' => 'sometimes|in:BEFORE,AFTER',
            'pharmacy_enabled' => 'sometimes|boolean',
            'queue_late_arrival_policy' => 'sometimes|in:FAIR_16_24,END_OF_QUEUE',
            'queue_missed_recall_penalty' => 'sometimes|in:END_OF_WAITING,AFTER_3',
            'sms_enabled' => 'sometimes|boolean',
            'sms_gateway_provider' => 'sometimes|string',
            'sms_sender_mask' => 'sometimes|string|max:11',
            'turn_alert_threshold' => 'sometimes|integer|min:1|max:10',
            'thermal_printer_width' => 'sometimes|in:80mm,58mm',
            'clinic_branding' => 'sometimes|array',
        ]);

        foreach ($validated as $key => $value) {
            ClinicSetting::set($key, $value);
        }

        return $this->index();
    }
}
