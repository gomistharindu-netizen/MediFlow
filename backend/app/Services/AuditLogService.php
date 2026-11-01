<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Support\Facades\Log;

class AuditLogService
{
    /**
     * Record a tamper-proof audit trail event for HIPAA/PDPA compliance.
     */
    public static function log(
        string $action,
        string $resourceType,
        $resourceId = null,
        ?string $patientId = null,
        ?array $details = null
    ): ?AuditLog {
        try {
            $user = auth()->user();
            $role = null;
            if ($user) {
                if (method_exists($user, 'getRoleNames')) {
                    $role = $user->getRoleNames()->first() ?? 'Staff';
                } else {
                    $role = $user->role ?? 'Staff';
                }
            }

            return AuditLog::create([
                'user_id' => $user?->id,
                'user_name' => $user?->name ?? 'System Service',
                'user_role' => $role ?? 'System',
                'action' => strtoupper($action),
                'resource_type' => $resourceType,
                'resource_id' => (string) $resourceId,
                'patient_id' => $patientId,
                'ip_address' => request()->ip() ?? '127.0.0.1',
                'user_agent' => substr(request()->userAgent() ?? 'N/A', 0, 500),
                'details' => $details,
                'created_at' => now(),
            ]);
        } catch (\Throwable $e) {
            Log::error("PDPA/HIPAA AuditLog failed to record: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Fetch recent audit logs with pagination & filtering.
     */
    public static function getLogs(int $perPage = 30, array $filters = [])
    {
        $query = AuditLog::orderBy('created_at', 'desc');

        if (!empty($filters['action'])) {
            $query->where('action', $filters['action']);
        }

        if (!empty($filters['patient_id'])) {
            $query->where('patient_id', 'LIKE', '%' . $filters['patient_id'] . '%');
        }

        if (!empty($filters['user_id'])) {
            $query->where('user_id', $filters['user_id']);
        }

        return $query->paginate($perPage);
    }
}
