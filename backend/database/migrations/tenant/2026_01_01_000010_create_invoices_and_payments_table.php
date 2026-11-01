<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->string('invoice_number')->unique(); // e.g. INV-2026-00001
            $table->foreignId('visit_id')->constrained('visits')->onDelete('cascade');
            $table->foreignId('patient_id')->constrained('patients')->onDelete('cascade');
            
            // Itemized amounts
            $table->decimal('consultation_fee', 10, 2)->default(0.00);
            $table->decimal('pharmacy_fee', 10, 2)->default(0.00);
            $table->decimal('other_procedures_fee', 10, 2)->default(0.00);
            $table->decimal('discount_amount', 10, 2)->default(0.00);
            $table->decimal('total_amount', 10, 2)->default(0.00);
            $table->decimal('paid_amount', 10, 2)->default(0.00);
            $table->decimal('balance_due', 10, 2)->default(0.00);
            
            $table->enum('status', ['UNPAID', 'PARTIALLY_PAID', 'PAID', 'VOID'])->default('UNPAID');
            $table->timestamps();

            $table->index(['created_at', 'status']);
        });

        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained('invoices')->onDelete('cascade');
            $table->string('receipt_number')->unique(); // e.g. RCP-2026-00001
            $table->decimal('amount', 10, 2);
            $table->enum('payment_method', ['CASH', 'CREDIT_CARD', 'BANK_TRANSFER', 'QR_PAY'])->default('CASH');
            $table->enum('charge_type', ['CONSULTATION_ONLY', 'PHARMACY_ONLY', 'FULL_SETTLEMENT'])->default('FULL_SETTLEMENT');
            $table->foreignId('cashier_id')->constrained('users')->onDelete('cascade');
            $table->string('reference_note')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
        Schema::dropIfExists('invoices');
    }
};
