<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            $table->boolean('consent_given')->default(true)->after('notes');
            $table->timestamp('consent_timestamp')->nullable()->after('consent_given');
            $table->string('consent_method')->default('DIGITAL_CHECKBOX')->after('consent_timestamp'); // DIGITAL_CHECKBOX, VERBAL_DESK, PAPER_FORM
            $table->string('consent_language')->default('si')->after('consent_method'); // si, en, ta
            $table->string('data_processing_notes')->nullable()->after('consent_language');
        });
    }

    public function down(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            $table->dropColumn([
                'consent_given',
                'consent_timestamp',
                'consent_method',
                'consent_language',
                'data_processing_notes',
            ]);
        });
    }
};
