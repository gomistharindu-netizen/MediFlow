<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('visits', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('patient_id')->constrained('patients')->onDelete('cascade');
            $table->foreignId('doctor_id')->constrained('doctors')->onDelete('cascade');
            $table->foreignId('doctor_session_id')->nullable()->constrained('doctor_sessions')->nullOnDelete();
            
            $table->string('booking_reference')->unique(); // e.g. APT-20261017-001
            $table->unsignedInteger('token_number'); // Permanent booked token e.g. 16 or 24
            $table->date('visit_date');
            
            // Queue & Consultation Lifecycle Status
            $table->enum('status', [
                'NOT_CHECKED_IN',
                'WAITING',
                'CALLED',
                'IN_CONSULTATION',
                'COMPLETED',
                'MISSED',
                'CANCELLED'
            ])->default('NOT_CHECKED_IN');

            // Fair Queue & Priority
            $table->enum('priority_level', ['NORMAL', 'EMERGENCY'])->default('NORMAL');
            $table->text('priority_reason')->nullable();
            
            // Timestamps for audit & queue duration analytics
            $table->timestamp('checked_in_at')->nullable();
            $table->timestamp('called_at')->nullable();
            $table->timestamp('consultation_started_at')->nullable();
            $table->timestamp('completed_at')->nullable();

            // Vitals (JSON: bp, pulse, temp_f, weight_kg, blood_sugar_mg_dl, spo2)
            $table->json('vitals')->nullable();

            // Clinical Notes
            $table->text('chief_complaint')->nullable();
            $table->text('diagnosis')->nullable();
            $table->text('clinical_notes')->nullable();
            $table->text('doctor_private_notes')->nullable();

            $table->timestamps();

            // Performance Indexes
            $table->index(['visit_date', 'status']);
            $table->index(['doctor_id', 'visit_date', 'status']);
            $table->index(['patient_id', 'visit_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('visits');
    }
};
