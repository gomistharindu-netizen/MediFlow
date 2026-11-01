<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;
use Stancl\Tenancy\Middleware\InitializeTenancyByRequestData;
use Stancl\Tenancy\Middleware\InitializeTenancyByDomain;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ClinicSettingsController;
use App\Http\Controllers\Api\PatientController;
use App\Http\Controllers\Api\DoctorController;
use App\Http\Controllers\Api\BookingController;
use App\Http\Controllers\Api\QueueController;
use App\Http\Controllers\Api\MedicineController;
use App\Http\Controllers\Api\ConsultationController;
use App\Http\Controllers\Api\LabReportController;
use App\Http\Controllers\Api\DispensaryController;
use App\Http\Controllers\Api\InvoiceController;

// Tenant REST API Routes (Initialized via X-Tenant header or ?tenant= parameter)
Route::middleware([
    'api',
    InitializeTenancyByRequestData::class,
])->prefix('api')->group(function () {
    
    // Public Clinic & TV Display Endpoints
    Route::get('/settings', [ClinicSettingsController::class, 'index']);
    Route::post('/auth/login', [AuthController::class, 'login']);
    Route::get('/queue', [QueueController::class, 'index']);
    Route::post('/checkin', [QueueController::class, 'checkIn']);

    // Protected Staff Routes
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::post('/auth/change-password', [\App\Http\Controllers\Api\PasswordResetController::class, 'changePassword']);
        Route::post('/auth/admin-reset-password/{userId}', [\App\Http\Controllers\Api\PasswordResetController::class, 'adminResetPassword']);

        // Settings Update (Admin)
        Route::post('/settings', [ClinicSettingsController::class, 'update']);

        // Staff Management & RBAC Roles (Admin)
        Route::get('/staff', [\App\Http\Controllers\Api\StaffManagementController::class, 'index']);
        Route::post('/staff', [\App\Http\Controllers\Api\StaffManagementController::class, 'store']);
        Route::put('/staff/{id}/role', [\App\Http\Controllers\Api\StaffManagementController::class, 'updateRole']);
        Route::delete('/staff/{id}', [\App\Http\Controllers\Api\StaffManagementController::class, 'destroy']);

        // Patient Directory
        Route::get('/patients', [PatientController::class, 'index']);
        Route::post('/patients', [PatientController::class, 'store']);
        Route::get('/patients/{id}', [PatientController::class, 'show']);
        Route::put('/patients/{id}', [PatientController::class, 'update']);
        Route::patch('/patients/{id}', [PatientController::class, 'update']);

        // Doctors & Sessions Management
        Route::get('/doctors', [DoctorController::class, 'index']);
        Route::get('/doctor-sessions', [DoctorController::class, 'sessions']);
        Route::post('/doctor-sessions', [DoctorController::class, 'storeSession']);
        Route::put('/doctor-sessions/{id}', [DoctorController::class, 'updateSession']);
        Route::patch('/doctor-sessions/{id}', [DoctorController::class, 'updateSession']);
        Route::delete('/doctor-sessions/{id}', [DoctorController::class, 'destroySession']);

        // Appointments & Bookings
        Route::post('/bookings', [BookingController::class, 'store']);

        // Queue Actions
        Route::post('/queue/call', [QueueController::class, 'call']);
        Route::post('/queue/start', [QueueController::class, 'startConsultation']);
        Route::post('/queue/missed', [QueueController::class, 'missed']);
        Route::post('/queue/complete', [QueueController::class, 'complete']);
        Route::post('/queue/emergency-priority', [QueueController::class, 'emergencyPriority']);

        // Medicines Catalog & Pharmacy Inventory Management
        Route::get('/medicines', [MedicineController::class, 'index']);
        Route::post('/medicines', [MedicineController::class, 'store']);
        Route::get('/medicines/{id}', [MedicineController::class, 'show']);
        Route::put('/medicines/{id}', [MedicineController::class, 'update']);
        Route::patch('/medicines/{id}', [MedicineController::class, 'update']);
        Route::post('/medicines/{id}/batches', [MedicineController::class, 'addBatch']);

        // Clinical Consultations & Prescriptions
        Route::get('/visits/{id}', [ConsultationController::class, 'getVisitDetails']);
        Route::post('/consultations/{visit_id}', [ConsultationController::class, 'submitConsultation']);
        Route::get('/patients/{id}/history', [ConsultationController::class, 'getPatientHistory']);

        // Lab Diagnostic Reports
        Route::get('/lab-reports', [LabReportController::class, 'index']);
        Route::post('/lab-reports', [LabReportController::class, 'store']);
        Route::patch('/lab-reports/{id}/review', [LabReportController::class, 'review']);

        // In-house Pharmacy Dispensary (FIFO)
        Route::get('/pharmacy/pending', [DispensaryController::class, 'pendingPrescriptions']);
        Route::post('/pharmacy/dispense/{prescription_id}', [DispensaryController::class, 'dispense']);
        Route::post('/pharmacy/external/{prescription_id}', [DispensaryController::class, 'markExternal']);
        Route::post('/pharmacy/external-visit/{visit_id}', [DispensaryController::class, 'markExternalByVisit']);
        Route::get('/pharmacy/alerts', [DispensaryController::class, 'inventoryAlerts']);

        // Cashier Billing & Invoicing (Dual-Mode)
        Route::get('/invoices', [InvoiceController::class, 'index']);
        Route::get('/invoices/visit/{visit_id}', [InvoiceController::class, 'getForVisit']);
        Route::post('/invoices/{id}/settle', [InvoiceController::class, 'settle']);
        Route::get('/reports/reconciliation', [InvoiceController::class, 'reconciliation']);

        // Hardware Integrations (Thermal ESC/POS & SMS Logs)
        Route::get('/thermal/token/{visit_id}', [\App\Http\Controllers\Api\HardwareIntegrationController::class, 'printTokenSlip']);
        Route::get('/thermal/receipt/{payment_id}', [\App\Http\Controllers\Api\HardwareIntegrationController::class, 'printReceiptSlip']);
        Route::get('/sms/logs', [\App\Http\Controllers\Api\HardwareIntegrationController::class, 'smsLogs']);

        // OCR Handwriting Recognition (Gemini Vision / Google Cloud Vision)
        Route::post('/ocr/handwriting', [\App\Http\Controllers\Api\OcrController::class, 'handwriting']);

        // HIPAA & PDPA Compliance & Audit Logs
        Route::get('/audit-logs', [\App\Http\Controllers\Api\AuditLogController::class, 'index']);
        Route::get('/compliance/status', [\App\Http\Controllers\Api\AuditLogController::class, 'complianceStatus']);
    });
});

// Tenant Web Routes (Initialized via Domain / Subdomain)
Route::middleware([
    'web',
    InitializeTenancyByDomain::class,
])->group(function () {
    Route::get('/tenant-status', function () {
        return response()->json([
            'message' => 'MediFlow Tenant Web Gateway',
            'tenant' => tenant('id'),
        ]);
    });
});
