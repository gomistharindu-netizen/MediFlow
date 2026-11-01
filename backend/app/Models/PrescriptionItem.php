<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PrescriptionItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'prescription_id',
        'medicine_id',
        'medicine_name',
        'dosage',
        'frequency',
        'duration',
        'instructions',
        'quantity_prescribed',
        'quantity_dispensed',
        'dispensed_batch_id',
        'unit_price',
        'total_price',
    ];

    protected function casts(): array
    {
        return [
            'quantity_prescribed' => 'integer',
            'quantity_dispensed' => 'integer',
            'unit_price' => 'decimal:2',
            'total_price' => 'decimal:2',
        ];
    }

    public function prescription(): BelongsTo
    {
        return $this->belongsTo(Prescription::class);
    }

    public function medicine(): BelongsTo
    {
        return $this->belongsTo(Medicine::class);
    }

    public function batch(): BelongsTo
    {
        return $this->belongsTo(MedicineBatch::class, 'dispensed_batch_id');
    }

    public function dispensedBatch(): BelongsTo
    {
        return $this->belongsTo(MedicineBatch::class, 'dispensed_batch_id');
    }
}
