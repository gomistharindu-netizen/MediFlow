<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LabReport extends Model
{
    use HasFactory;

    protected $fillable = [
        'patient_id',
        'visit_id',
        'test_name',
        'laboratory_name',
        'test_date',
        'status',
        'file_path',
        'file_mime_type',
        'extracted_parameters',
        'doctor_review_notes',
        'reviewed_by_doctor_id',
        'reviewed_at',
        'uploaded_by_user_id',
    ];

    protected function casts(): array
    {
        return [
            'test_date' => 'date',
            'reviewed_at' => 'datetime',
            'extracted_parameters' => 'array',
        ];
    }

    protected $appends = [
        'file_url',
    ];

    public function getFileUrlAttribute(): ?string
    {
        if (!$this->file_path) {
            return null;
        }
        return asset('storage/' . $this->file_path);
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function visit(): BelongsTo
    {
        return $this->belongsTo(Visit::class);
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class, 'reviewed_by_doctor_id');
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by_user_id');
    }
}
