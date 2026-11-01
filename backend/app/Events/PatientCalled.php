<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class PatientCalled implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public string $tenantId,
        public int $visitId,
        public int $tokenNumber,
        public string $patientName,
        public string $doctorName,
        public string $roomNumber,
        public string $calledAt
    ) {}

    public function broadcastOn(): array
    {
        return [
            new Channel("tenant.{$this->tenantId}.queue"),
        ];
    }

    public function broadcastAs(): string
    {
        return 'PatientCalled';
    }

    public function broadcastWith(): array
    {
        return [
            'tenant_id' => $this->tenantId,
            'visit_id' => $this->visitId,
            'token_number' => $this->tokenNumber,
            'patient_name' => $this->patientName,
            'doctor_name' => $this->doctorName,
            'room_number' => $this->roomNumber,
            'called_at' => $this->calledAt,
        ];
    }
}
