<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Visit extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid',
        'patient_id',
        'doctor_id',
        'doctor_session_id',
        'booking_reference',
        'token_number',
        'visit_date',
        'status',
        'priority_level',
        'priority_reason',
        'checked_in_at',
        'called_at',
        'consultation_started_at',
        'completed_at',
        'vitals',
        'chief_complaint',
        'diagnosis',
        'clinical_notes',
        'doctor_private_notes',
    ];

    protected function casts(): array
    {
        return [
            'visit_date' => 'date',
            'token_number' => 'integer',
            'checked_in_at' => 'datetime',
            'called_at' => 'datetime',
            'consultation_started_at' => 'datetime',
            'completed_at' => 'datetime',
            'vitals' => 'array',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Visit $visit) {
            if (empty($visit->uuid)) {
                $visit->uuid = (string) Str::uuid();
            }
            if (empty($visit->booking_reference)) {
                $dateStr = date('Ymd');
                $random = strtoupper(Str::random(4));
                $visit->booking_reference = "APT-{$dateStr}-{$random}";
            }
        });
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class);
    }

    public function session(): BelongsTo
    {
        return $this->belongsTo(DoctorSession::class, 'doctor_session_id');
    }

    public function prescription(): HasOne
    {
        return $this->hasOne(Prescription::class);
    }

    public function invoice(): HasOne
    {
        return $this->hasOne(Invoice::class);
    }

    public function labReports(): HasMany
    {
        return $this->hasMany(LabReport::class);
    }
}
