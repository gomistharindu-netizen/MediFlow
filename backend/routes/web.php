<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'status' => 'online',
        'service' => 'MediFlow Smart Clinic & Hospital Management API Gateway',
        'version' => '1.0.0',
        'active_tenants' => ['nawaloka', 'asiri', 'arogya', 'suwapiyasa'],
        'docs' => 'API is active and ready for Next.js frontend',
        'timestamp' => now()->toIso8601String(),
    ]);
});

Route::get('/api/health', function () {
    return response()->json([
        'status' => 'healthy',
        'database' => 'connected',
        'timestamp' => now()->toIso8601String(),
    ]);
});
