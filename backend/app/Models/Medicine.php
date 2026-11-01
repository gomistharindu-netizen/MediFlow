<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Medicine extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'generic_name',
        'dosage_form',
        'strength',
        'reorder_level',
        'unit',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'reorder_level' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function batches(): HasMany
    {
        return $this->hasMany(MedicineBatch::class);
    }

    public function usableBatches(): HasMany
    {
        return $this->hasMany(MedicineBatch::class)
            ->where('quantity_available', '>', 0)
            ->where('expiry_date', '>', now()->toDateString())
            ->orderBy('expiry_date', 'asc'); // Strict FIFO by earliest expiry
    }

    public function getTotalStockAttribute(): int
    {
        return (int) $this->usableBatches()->sum('quantity_available');
    }
}
