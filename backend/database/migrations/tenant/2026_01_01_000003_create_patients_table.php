<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('patients', function (Blueprint $table) {
            $table->id();
            $table->string('patient_id')->unique(); // e.g. MF-2026-00001
            $table->string('first_name');
            $table->string('last_name')->nullable();
            $table->string('nic')->nullable();
            $table->string('phone')->index();
            $table->date('date_of_birth')->nullable();
            $table->enum('gender', ['male', 'female', 'other'])->default('male');
            $table->text('address')->nullable();
            $table->json('allergies')->nullable(); // e.g. ["Penicillin", "Sulfa drugs"]
            $table->json('chronic_conditions')->nullable(); // e.g. ["Hypertension", "Type 2 Diabetes"]
            $table->string('guardian_name')->nullable();
            $table->string('guardian_relation')->nullable();
            $table->string('emergency_phone')->nullable();
            $table->text('notes')->nullable();
            $table->softDeletes();
            $table->timestamps();

            $table->index(['phone', 'first_name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('patients');
    }
};
