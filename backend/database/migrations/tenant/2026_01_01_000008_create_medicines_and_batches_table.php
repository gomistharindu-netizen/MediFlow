<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('medicines', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // Brand name e.g. "Panadol"
            $table->string('generic_name')->nullable(); // e.g. "Paracetamol"
            $table->string('dosage_form')->default('Tablet'); // Tablet, Syrup, Injection, Capsule, Cream, Drops
            $table->string('strength')->nullable(); // e.g. "500mg", "120mg/5ml"
            $table->unsignedInteger('reorder_level')->default(50);
            $table->string('unit')->default('tablets');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['name', 'generic_name']);
        });

        Schema::create('medicine_batches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('medicine_id')->constrained('medicines')->onDelete('cascade');
            $table->string('batch_number');
            $table->date('expiry_date')->index(); // Critical for earliest-expiry FIFO queries
            $table->unsignedInteger('quantity_received');
            $table->unsignedInteger('quantity_available')->index();
            $table->decimal('purchase_unit_price', 10, 2)->default(0.00);
            $table->decimal('selling_unit_price', 10, 2);
            $table->string('supplier_name')->nullable();
            $table->timestamps();

            $table->index(['medicine_id', 'expiry_date', 'quantity_available']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('medicine_batches');
        Schema::dropIfExists('medicines');
    }
};
