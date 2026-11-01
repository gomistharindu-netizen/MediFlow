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

    /**
     * Create a new medicine in the pharmacy catalog.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'          => 'required|string|max:255',
            'generic_name'  => 'nullable|string|max:255',
            'dosage_form'   => 'required|in:Tablet,Capsule,Syrup,Injection,Cream,Drops,Inhaler,Patch,Suppository,Other',
            'strength'      => 'nullable|string|max:100',
            'unit'          => 'required|string|max:50',
            'reorder_level' => 'nullable|integer|min:0',
            'is_active'     => 'sometimes|boolean',
        ]);

        $medicine = \App\Models\Medicine::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Medicine added to catalog successfully.',
            'data'    => $medicine,
        ], 201);
    }

    /**
     * Update medicine master data.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $medicine = \App\Models\Medicine::findOrFail($id);

        $validated = $request->validate([
            'name'          => 'sometimes|string|max:255',
            'generic_name'  => 'nullable|string|max:255',
            'dosage_form'   => 'sometimes|in:Tablet,Capsule,Syrup,Injection,Cream,Drops,Inhaler,Patch,Suppository,Other',
            'strength'      => 'nullable|string|max:100',
            'unit'          => 'sometimes|string|max:50',
            'reorder_level' => 'nullable|integer|min:0',
            'is_active'     => 'sometimes|boolean',
        ]);

        $medicine->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Medicine updated successfully.',
            'data'    => $medicine->fresh(),
        ]);
    }

    /**
     * Add a new stock batch (FIFO) to an existing medicine.
     */
    public function addBatch(Request $request, int $id): JsonResponse
    {
        $medicine = \App\Models\Medicine::findOrFail($id);

        $validated = $request->validate([
            'batch_number'       => 'required|string|max:100',
            'expiry_date'        => 'required|date|after:today',
            'quantity_received'  => 'required|integer|min:1',
            'purchase_unit_price'=> 'nullable|numeric|min:0',
            'selling_unit_price' => 'required|numeric|min:0',
            'supplier_name'      => 'nullable|string|max:255',
        ]);

        $validated['quantity_available'] = $validated['quantity_received'];

        $batch = $medicine->batches()->create($validated);

        return response()->json([
            'success' => true,
            'message' => "Batch {$batch->batch_number} added. {$batch->quantity_received} units in stock.",
            'data'    => $batch,
        ], 201);
    }

    /**
     * Get full medicine details with all batches.
     */
    public function show(int $id): JsonResponse
    {
        $medicine = \App\Models\Medicine::with(['batches' => function ($q) {
            $q->orderBy('expiry_date', 'asc');
        }])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data'    => $medicine,
        ]);
    }
}
