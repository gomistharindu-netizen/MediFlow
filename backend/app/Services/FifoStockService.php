<?php

namespace App\Services;

use App\Models\Prescription;
use App\Models\PrescriptionItem;
use App\Models\Medicine;
use App\Models\MedicineBatch;
use App\Models\ClinicSetting;
use Illuminate\Support\Facades\DB;
use Exception;

class FifoStockService
{
    /**
     * Dispense a prescription using Earliest-Expiry-First-Out (FIFO) logic.
     */
    public function dispensePrescription(int $prescriptionId): Prescription
    {
        $pharmacyEnabled = ClinicSetting::get('pharmacy_enabled', true);

        $prescription = Prescription::with(['items.medicine', 'visit'])->findOrFail($prescriptionId);

        // If pharmacy module is disabled for this clinic, mark as EXTERNAL prescription
        if (!$pharmacyEnabled) {
            $prescription->update([
                'dispense_status' => 'EXTERNAL',
            ]);
            return $prescription;
        }

        if ($prescription->dispense_status === 'DISPENSED') {
            return $prescription;
        }

        DB::transaction(function () use ($prescription) {
            foreach ($prescription->items as $item) {
                if ($item->medicine_id) {
                    $this->dispenseItemFifo($item);
                } else {
                    // Try to match by medicine_name
                    $nameSearch = strtok($item->medicine_name, ' ');
                    $matchedMedicine = Medicine::where('name', 'LIKE', "%{$nameSearch}%")->first();
                    if ($matchedMedicine) {
                        $item->medicine_id = $matchedMedicine->id;
                        $this->dispenseItemFifo($item);
                    } else {
                        // Unmatched external item: mark dispensed with default price
                        $item->update([
                            'quantity_dispensed' => $item->quantity_prescribed,
                            'unit_price' => 0.00,
                            'total_price' => 0.00,
                        ]);
                    }
                }
            }

            $prescription->update([
                'dispense_status' => 'DISPENSED',
            ]);
        });

        return $prescription->fresh(['items.dispensedBatch']);
    }

    /**
     * Mark a prescription as EXTERNAL (patient buys medicine outside).
     * If the prescription was already DISPENSED, restores deducted stock to the respective batches.
     * Resets item prices so pharmacy fees will be 0 in cashier invoices.
     */
    public function markPrescriptionAsExternal(int $prescriptionId): Prescription
    {
        $prescription = Prescription::with(['items.dispensedBatch', 'visit'])->findOrFail($prescriptionId);

        DB::transaction(function () use ($prescription) {
            foreach ($prescription->items as $item) {
                // If it was dispensed and had stock deducted from a batch, restore stock
                if ($prescription->dispense_status === 'DISPENSED' && $item->dispensed_batch_id && $item->quantity_dispensed > 0) {
                    $batch = MedicineBatch::find($item->dispensed_batch_id);
                    if ($batch) {
                        $batch->increment('quantity_available', $item->quantity_dispensed);
                    }
                }

                // Reset item pricing and dispensed quantities to 0
                $item->update([
                    'quantity_dispensed' => 0,
                    'dispensed_batch_id' => null,
                    'unit_price' => 0.00,
                    'total_price' => 0.00,
                ]);
            }

            $prescription->update([
                'dispense_status' => 'EXTERNAL',
            ]);
        });

        return $prescription->fresh(['items']);
    }

    /**
     * Deduct stock from earliest expiry batches for a single item (EEFO/FIFO).
     */
    protected function dispenseItemFifo(PrescriptionItem $item): void
    {
        $quantityNeeded = $item->quantity_prescribed;
        $totalCharged = 0.00;
        $primaryBatchId = null;
        $unitPrice = 0.00;

        // Fetch usable batches ordered by expiry_date ASC (Earliest Expiry First Out)
        $batches = MedicineBatch::where('medicine_id', $item->medicine_id)
            ->where('quantity_available', '>', 0)
            ->where('expiry_date', '>', now()->toDateString())
            ->orderBy('expiry_date', 'asc')
            ->lockForUpdate()
            ->get();

        $remainingToDeduct = $quantityNeeded;

        foreach ($batches as $batch) {
            if ($remainingToDeduct <= 0) {
                break;
            }

            if (!$primaryBatchId) {
                $primaryBatchId = $batch->id;
                $unitPrice = (float) $batch->selling_unit_price;
            }

            $deductFromThisBatch = min($batch->quantity_available, $remainingToDeduct);
            
            $batch->decrement('quantity_available', $deductFromThisBatch);
            $totalCharged += ($deductFromThisBatch * (float) $batch->selling_unit_price);
            $remainingToDeduct -= $deductFromThisBatch;
        }

        $dispensedQty = $quantityNeeded - $remainingToDeduct;

        // Fallback pricing if stock was empty
        if (!$unitPrice && $item->medicine_id) {
            $latestBatch = MedicineBatch::where('medicine_id', $item->medicine_id)->latest('id')->first();
            $unitPrice = $latestBatch ? (float) $latestBatch->selling_unit_price : 10.00;
            $totalCharged = $quantityNeeded * $unitPrice;
            $dispensedQty = $quantityNeeded;
        }

        $item->update([
            'quantity_dispensed' => $dispensedQty,
            'dispensed_batch_id' => $primaryBatchId,
            'unit_price' => $unitPrice,
            'total_price' => $totalCharged,
        ]);
    }

    /**
     * Get inventory items nearing expiry or low stock.
     */
    public function getInventoryAlerts(int $daysThreshold = 90): array
    {
        $nearingExpiry = MedicineBatch::with('medicine')
            ->where('quantity_available', '>', 0)
            ->where('expiry_date', '<=', now()->addDays($daysThreshold)->toDateString())
            ->orderBy('expiry_date', 'asc')
            ->get();

        $lowStock = Medicine::with('usableBatches')
            ->where('is_active', true)
            ->get()
            ->filter(function (Medicine $m) {
                return $m->total_stock <= $m->reorder_level;
            })
            ->values();

        return [
            'nearing_expiry_batches' => $nearingExpiry,
            'low_stock_medicines' => $lowStock,
        ];
    }
}
