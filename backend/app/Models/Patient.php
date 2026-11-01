<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
// Fix #1: Visit model import added (was missing — caused implicit class resolution)
use App\Models\Visit;

class Patient extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'patient_id',
        'first_name',
        'last_name',
        'nic',
        'phone',
        'date_of_birth',
        'gender',
        'address',
        'allergies',
        'chronic_conditions',
        'guardian_name',
        'guardian_relation',
        'emergency_phone',
        'notes',
        'consent_given',
        'consent_timestamp',
        'consent_method',
        'consent_language',
        'data_processing_notes',
    ];

    protected function casts(): array
    {
        return [
            'date_of_birth' => 'date',
            'consent_given' => 'boolean',
            'consent_timestamp' => 'datetime',
        ];
    }

    protected $appends = [
        'full_name',
    ];

    /**
     * HIPAA/PDPA: AES-256 field encryption for allergies at rest.
     */
    protected function allergies(): Attribute
    {
        return Attribute::make(
            get: function ($value) {
                if (empty($value)) return [];
                try {
                    $decrypted = decrypt($value);
                    return is_array($decrypted) ? $decrypted : json_decode($decrypted, true) ?? [];
                } catch (\Throwable $e) {
                    return is_array($value) ? $value : json_decode($value, true) ?? [];
                }
            },
            set: function ($value) {
                $array = is_array($value) ? $value : json_decode($value, true) ?? [];
                return encrypt($array);
            }
        );
    }

    /**
     * HIPAA/PDPA: AES-256 field encryption for chronic conditions at rest.
     */
    protected function chronicConditions(): Attribute
    {
        return Attribute::make(
            get: function ($value) {
                if (empty($value)) return [];
                try {
                    $decrypted = decrypt($value);
                    return is_array($decrypted) ? $decrypted : json_decode($decrypted, true) ?? [];
                } catch (\Throwable $e) {
                    return is_array($value) ? $value : json_decode($value, true) ?? [];
                }
            },
            set: function ($value) {
                $array = is_array($value) ? $value : json_decode($value, true) ?? [];
                return encrypt($array);
            }
        );
    }

    /**
     * HIPAA/PDPA: AES-256 field encryption for confidential clinical notes at rest.
     */
    protected function notes(): Attribute
    {
        return Attribute::make(
            get: function ($value) {
                if (empty($value)) return null;
                try {
                    return decrypt($value);
                } catch (\Throwable $e) {
                    return $value;
                }
            },
            set: function ($value) {
                return $value ? encrypt($value) : null;
            }
        );
    }

    public function visits(): HasMany
    {
        return $this->hasMany(Visit::class)->orderBy('visit_date', 'desc');
    }

    public function todayVisit()
    {
        return $this->hasOne(Visit::class)
            ->whereDate('visit_date', date('Y-m-d'))
            ->where('status', '!=', 'CANCELLED')
            ->latest('id');
    }

    public function getFullNameAttribute(): string
    {
        return trim("{$this->first_name} {$this->last_name}");
    }

    public static function generatePatientId(): string
    {
        $year = date('Y');
        $lastPatient = static::withTrashed()
            ->where('patient_id', 'LIKE', "MF-{$year}-%")
            ->orderBy('id', 'desc')
            ->first();

        if ($lastPatient) {
            $parts = explode('-', $lastPatient->patient_id);
            $seq = intval(end($parts)) + 1;
        } else {
            $seq = 1;
        }

        return sprintf('MF-%s-%05d', $year, $seq);
    }
}
