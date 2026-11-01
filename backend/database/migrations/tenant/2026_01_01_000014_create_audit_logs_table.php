<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('user_name')->nullable();
            $table->string('user_role')->nullable();
            $table->string('action')->index(); // VIEWED_PATIENT_CHART, REGISTERED_PATIENT, UPDATED_PATIENT, CREATED_PRESCRIPTION, DISPENSED_PRESCRIPTION, GENERATED_INVOICE, VIEWED_LAB_REPORT, DELETED_RECORD
            $table->string('resource_type')->index(); // Patient, Visit, Prescription, LabReport, Invoice, Setting
            $table->string('resource_id')->nullable();
            $table->string('patient_id')->nullable()->index(); // e.g. MF-2026-00001
            $table->string('ip_address')->nullable();
            $table->text('user_agent')->nullable();
            $table->json('details')->nullable(); // Context metadata / payload changes
            $table->timestamp('created_at')->useCurrent()->index();

            $table->index(['resource_type', 'resource_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
