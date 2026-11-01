<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DoctorSession extends Model
{
    use HasFactory;

    protected $fillable = [
        'doctor_id',
        'session_title',
        'day_of_week',
        'start_time',
        'end_time',
        'max_patients',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'max_patients' => 'integer',
        ];
    }

    /**
     * Always persist day_of_week in lowercase to satisfy database CHECK constraints.
     */
    public function setDayOfWeekAttribute($value): void
    {
        $this->attributes['day_of_week'] = strtolower((string)$value);
    }

    /**
     * Always return day_of_week capitalized for UI presentation.
     */
    public function getDayOfWeekAttribute($value): string
    {
        return ucfirst(strtolower((string)$value));
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class);
    }

    public function visits(): HasMany
    {
        return $this->hasMany(Visit::class);
    }
}
