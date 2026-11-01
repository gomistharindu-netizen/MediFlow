<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MedicineBatch extends Model
{
    use HasFactory;

    protected $fillable = [
        'medicine_id',
        'batch_number',
        'expiry_date',
        'quantity_received',
        'quantity_available',
        'purchase_unit_price',
        'selling_unit_price',
        'supplier_name',
    ];

    protected function casts(): array
    {
        return [
            'expiry_date' => 'date',
            'quantity_received' => 'integer',
            'quantity_available' => 'integer',
            'purchase_unit_price' => 'decimal:2',
            'selling_unit_price' => 'decimal:2',
        ];
    }

    public function medicine(): BelongsTo
    {
        return $this->belongsTo(Medicine::class);
    }

    public function getIsExpiredAttribute(): boolean
    {
        return $this->expiry_date->isPast();
    }
}
