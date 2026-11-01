<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\Central\CentralAuthController;
use App\Http\Controllers\Api\Central\CentralTenantController;

// Central Landlord SuperAdmin Endpoints (Running on Central DB)
Route::prefix('central')->group(function () {
    Route::post('/login', [CentralAuthController::class, 'login']);
    Route::get('/plans', [CentralTenantController::class, 'plans']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/me', [CentralAuthController::class, 'me']);
        Route::get('/stats', [CentralTenantController::class, 'stats']);
        Route::get('/tenants', [CentralTenantController::class, 'index']);
        Route::post('/tenants', [CentralTenantController::class, 'store']);
        Route::patch('/tenants/{id}', [CentralTenantController::class, 'update']);
    });
});

