<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('prescription_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('prescription_id')->constrained('prescriptions')->onDelete('cascade');
            $table->foreignId('medicine_id')->nullable()->constrained('medicines')->nullOnDelete();
            
            $table->string('medicine_name'); // e.g. "Amoxicillin 500mg"
            $table->string('dosage')->default('1 Capsule');
            $table->string('frequency')->default('TDS'); // BD, TDS, QDS, PRN, Mane, Nocte
            $table->string('duration')->default('5 days');
            $table->string('instructions')->nullable(); // e.g. "After meals"
            
            $table->unsignedInteger('quantity_prescribed');
            $table->unsignedInteger('quantity_dispensed')->default(0);
            
            // FIFO batch allocation
            $table->foreignId('dispensed_batch_id')->nullable()->constrained('medicine_batches')->nullOnDelete();
            $table->decimal('unit_price', 10, 2)->default(0.00);
            $table->decimal('total_price', 10, 2)->default(0.00);
            
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('prescription_items');
    }
};
