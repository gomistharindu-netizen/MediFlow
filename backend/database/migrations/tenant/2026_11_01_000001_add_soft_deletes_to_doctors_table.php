<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Fix: Add SoftDeletes support to doctors table
// Prevents orphaned visits/prescriptions when a doctor record is removed
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('doctors', function (Blueprint $table) {
            $table->softDeletes(); // Adds 'deleted_at' column
        });
    }

    public function down(): void
    {
        Schema::table('doctors', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });
    }
};
