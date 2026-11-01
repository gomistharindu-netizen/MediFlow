<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Medicine;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MedicineController extends Controller
{
    /**
     * Search and list active medicines from tenant catalog with FIFO available stock.
     */
    public function index(Request $request): JsonResponse
    {
        $search = $request->query('search', '');

        $query = Medicine::with(['usableBatches'])
            ->where('is_active', true);

        if (!empty($search)) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'LIKE', "%{$search}%")
                  ->orWhere('generic_name', 'LIKE', "%{$search}%");
            });
        }

        $medicines = $query->orderBy('name')->limit(50)->get()->map(function (Medicine $med) {
            $nameLower = strtolower($med->name . ' ' . $med->generic_name);

            // Allergy contraindication risk tags
            $isPenicillin = str_contains($nameLower, 'amoxicillin') 
                || str_contains($nameLower, 'amoxil') 
                || str_contains($nameLower, 'augmentin')
                || str_contains($nameLower, 'penicillin')
                || str_contains($nameLower, 'ampicillin')
                || str_contains($nameLower, 'cloxacillin');

            $isSulfa = str_contains($nameLower, 'bactrim')
                || str_contains($nameLower, 'cotrimoxazole')
                || str_contains($nameLower, 'sulfa');

            $isNsaid = str_contains($nameLower, 'aspirin')
                || str_contains($nameLower, 'ibuprofen')
                || str_contains($nameLower, 'diclofenac')
                || str_contains($nameLower, 'mefenamic');

            return [
                'id' => $med->id,
                'name' => $med->name,
                'generic_name' => $med->generic_name,
                'dosage_form' => $med->dosage_form,
                'strength' => $med->strength,
                'unit' => $med->unit,
                'total_stock' => $med->total_stock,
                'is_penicillin' => $isPenicillin,
                'is_sulfa' => $isSulfa,
                'is_nsaid' => $isNsaid,
                'batches_count' => $med->usableBatches->count(),
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $medicines,
        ]);
    }
}
