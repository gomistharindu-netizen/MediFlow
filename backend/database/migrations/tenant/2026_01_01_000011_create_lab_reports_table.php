<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lab_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_id')->constrained('patients')->onDelete('cascade');
            $table->foreignId('visit_id')->nullable()->constrained('visits')->nullOnDelete();
            
            $table->string('test_name'); // e.g. "Full Blood Count (FBC)", "Lipid Profile"
            $table->string('laboratory_name')->nullable(); // e.g. "Asiri Laboratories"
            $table->date('test_date')->nullable();
            
            $table->enum('status', ['PENDING', 'RECEIVED', 'REVIEWED'])->default('PENDING');
            
            // Uploaded scan file
            $table->string('file_path')->nullable();
            $table->string('file_mime_type')->nullable();
            
            // Extracted values (Structured JSON, optionally via Gemini AI OCR)
            $table->json('extracted_parameters')->nullable(); 

            // Clinical Review
            $table->text('doctor_review_notes')->nullable();
            $table->foreignId('reviewed_by_doctor_id')->nullable()->constrained('doctors')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();

            $table->foreignId('uploaded_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['patient_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lab_reports');
    }
};
