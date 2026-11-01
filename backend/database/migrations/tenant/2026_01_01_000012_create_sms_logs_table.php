<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sms_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('visit_id')->nullable()->constrained('visits')->nullOnDelete();
            $table->foreignId('patient_id')->nullable()->constrained('patients')->nullOnDelete();
            $table->string('recipient_phone', 20);
            $table->string('message_type', 50)->default('GENERAL');
            $table->text('message_body');
            $table->string('sender_mask', 50)->default('MEDIFLOW');
            $table->string('gateway_provider', 50)->default('mock');
            $table->string('status', 30)->default('SENT'); // SENT, MOCKED, FAILED
            $table->text('gateway_response')->nullable();
            $table->timestamps();

            $table->index(['created_at', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sms_logs');
    }
};
