<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * OCR Handwriting-to-Text Controller
 *
 * Accepts a base64 image (doctor stylus drawing / handwritten clinical notes)
 * and returns extracted text using Google Cloud Vision API (or Gemini Vision).
 *
 * Fallback: Returns a structured placeholder if API key is not configured.
 */
class OcrController extends Controller
{
    /**
     * Convert handwritten clinical notes image to text.
     *
     * POST /api/ocr/handwriting
     * Body: { "image": "data:image/png;base64,..." }
     */
    public function handwriting(Request $request): JsonResponse
    {
        $request->validate([
            'image' => 'required|string',
        ]);

        $imageData = $request->input('image');

        // Strip data URL prefix if present (data:image/png;base64,...)
        if (str_contains($imageData, ',')) {
            $imageData = substr($imageData, strpos($imageData, ',') + 1);
        }

        // Try Google Gemini Vision API (preferred — already used via GEMINI_API_KEY)
        $geminiKey = config('services.gemini.api_key', env('GEMINI_API_KEY'));

        if ($geminiKey) {
            try {
                $response = Http::timeout(20)->post(
                    "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={$geminiKey}",
                    [
                        'contents' => [
                            [
                                'parts' => [
                                    [
                                        'text' => 'You are a medical transcription assistant. Extract and transcribe ALL handwritten text from this clinical notes image exactly as written. Return only the transcribed text, no commentary.',
                                    ],
                                    [
                                        'inline_data' => [
                                            'mime_type' => 'image/png',
                                            'data'      => $imageData,
                                        ],
                                    ],
                                ],
                            ],
                        ],
                        'generationConfig' => [
                            'temperature'     => 0.1,
                            'maxOutputTokens' => 1024,
                        ],
                    ]
                );

                if ($response->successful()) {
                    $result   = $response->json();
                    $text     = $result['candidates'][0]['content']['parts'][0]['text'] ?? null;

                    if ($text) {
                        return response()->json([
                            'success' => true,
                            'data'    => ['text' => trim($text)],
                            'source'  => 'gemini_vision',
                        ]);
                    }
                }
            } catch (\Throwable $e) {
                Log::warning('MediFlow OCR: Gemini Vision failed', ['error' => $e->getMessage()]);
            }
        }

        // Try Google Cloud Vision API (fallback)
        $visionKey = config('services.google_vision.api_key', env('GOOGLE_VISION_API_KEY'));

        if ($visionKey) {
            try {
                $response = Http::timeout(15)->post(
                    "https://vision.googleapis.com/v1/images:annotate?key={$visionKey}",
                    [
                        'requests' => [
                            [
                                'image'    => ['content' => $imageData],
                                'features' => [
                                    ['type' => 'DOCUMENT_TEXT_DETECTION', 'maxResults' => 1],
                                ],
                            ],
                        ],
                    ]
                );

                if ($response->successful()) {
                    $text = $response->json('responses.0.fullTextAnnotation.text');
                    if ($text) {
                        return response()->json([
                            'success' => true,
                            'data'    => ['text' => trim($text)],
                            'source'  => 'google_vision',
                        ]);
                    }
                }
            } catch (\Throwable $e) {
                Log::warning('MediFlow OCR: Google Vision failed', ['error' => $e->getMessage()]);
            }
        }

        // Graceful fallback — inform frontend that OCR is not configured
        return response()->json([
            'success' => false,
            'message' => 'OCR service not configured. Add GEMINI_API_KEY or GOOGLE_VISION_API_KEY to .env to enable handwriting recognition.',
            'data'    => ['text' => ''],
        ], 503);
    }
}
