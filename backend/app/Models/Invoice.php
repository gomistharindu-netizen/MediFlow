<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Invoice extends Model
{
    use HasFactory;

    protected $fillable = [
        'invoice_number',
        'visit_id',
        'patient_id',
        'consultation_fee',
        'pharmacy_fee',
        'other_procedures_fee',
        'discount_amount',
        'total_amount',
        'paid_amount',
        'balance_due',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'consultation_fee' => 'decimal:2',
            'pharmacy_fee' => 'decimal:2',
            'other_procedures_fee' => 'decimal:2',
            'discount_amount' => 'decimal:2',
            'total_amount' => 'decimal:2',
            'paid_amount' => 'decimal:2',
            'balance_due' => 'decimal:2',
        ];
    }

    public function visit(): BelongsTo
    {
        return $this->belongsTo(Visit::class);
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public static function generateInvoiceNumber(): string
    {
        $year = date('Y');
        $last = static::where('invoice_number', 'LIKE', "INV-{$year}-%")
            ->orderBy('id', 'desc')
            ->first();

        $seq = $last ? (intval(substr($last->invoice_number, -5)) + 1) : 1;
        return sprintf('INV-%s-%05d', $year, $seq);
    }
}
