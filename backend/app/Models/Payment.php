<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    use HasFactory;

    protected $fillable = [
        'invoice_id',
        'receipt_number',
        'amount',
        'payment_method',
        'charge_type',
        'cashier_id',
        'reference_note',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
        ];
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function cashier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cashier_id');
    }

    public static function generateReceiptNumber(): string
    {
        $year = date('Y');
        $last = static::where('receipt_number', 'LIKE', "RCP-{$year}-%")
            ->orderBy('id', 'desc')
            ->first();

        $seq = $last ? (intval(substr($last->receipt_number, -5)) + 1) : 1;
        return sprintf('RCP-%s-%05d', $year, $seq);
    }
}
