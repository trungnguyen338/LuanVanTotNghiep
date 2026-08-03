<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ClientContractController;
use App\Http\Controllers\ConstructionLogController;
use App\Http\Controllers\ContractAddendumController;
use App\Http\Controllers\ContractItemController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\ProjectCategoryController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\ProjectDocumentController;
use App\Http\Controllers\ProjectPaymentController;
use App\Http\Controllers\ProjectTaskController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\SubContractAddendumController;
use App\Http\Controllers\SubContractController;
use App\Http\Controllers\SubcontractorController;
use App\Http\Controllers\TaskDetailController;
use App\Http\Controllers\UserController;
use App\Http\Resources\Auth\AuthResource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::post('admin/login', [AuthController::class, 'adminLogin']);
    Route::post('customer/login', [AuthController::class, 'customerLogin']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('logout', [AuthController::class, 'logout']);
        Route::get('me', function (Request $request) {
            return new AuthResource($request->user()->load('role'));
        });
        Route::post('change-password', [AuthController::class, 'changePassword']);
    });
});

Route::middleware('auth:sanctum')->group(function () {
    Route::get('dashboard/stats', [DashboardController::class, 'getStats']);
    Route::get('roles', [RoleController::class, 'index']);
    Route::apiResource('users', UserController::class);
    Route::get('customer/projects', [ProjectController::class, 'customerProjects']);

    // Partner Management
    Route::apiResource('customers', CustomerController::class);
    Route::apiResource('subcontractors', SubcontractorController::class);

    // Project Categories
    Route::apiResource('project-categories', ProjectCategoryController::class);

    // Projects
    Route::apiResource('projects', ProjectController::class);

    // Client Contracts
    Route::apiResource('client-contracts', ClientContractController::class);
    Route::post('client-contracts/{id}/documents', [ClientContractController::class, 'uploadDocuments']);

    // Contract Items
    Route::get('client-contracts/{contract}/items', [ContractItemController::class, 'index']);
    Route::post('client-contracts/{contract}/items', [ContractItemController::class, 'store']);
    Route::apiResource('contract-items', ContractItemController::class)->only(['update', 'destroy']);

    // Contract Addendums
    Route::get('client-contracts/{contract}/addendums', [ContractAddendumController::class, 'index']);
    Route::post('client-contracts/{contract}/addendums', [ContractAddendumController::class, 'store']);
    Route::apiResource('contract-addendums', ContractAddendumController::class)->only(['show', 'update', 'destroy']);

    // Sub Contractor Contracts
    Route::get('sub-contracts/{id}/eligible-tasks', [SubContractController::class, 'getEligibleTasks']);
    Route::apiResource('sub-contracts', SubContractController::class);
    Route::post('sub-contracts/{id}/documents', [SubContractController::class, 'uploadDocuments']);

    // Project Tasks
    Route::get('projects/{project}/tasks', [ProjectTaskController::class, 'index']);
    Route::post('projects/{project}/tasks', [ProjectTaskController::class, 'store']);
    Route::get('project-tasks/types', [ProjectTaskController::class, 'getTypes']);
    Route::apiResource('project-tasks', ProjectTaskController::class)->only(['show', 'update', 'destroy']);

    // Task Details & Subcontractor Assignments
    Route::get('project-tasks/{task}/details', [TaskDetailController::class, 'index']);
    Route::post('project-tasks/{task}/details', [TaskDetailController::class, 'store']);
    Route::post('task-details/{id}/request-acceptance', [TaskDetailController::class, 'requestAcceptance']);
    Route::get('subcontractor/tasks', [TaskDetailController::class, 'myTasks']);
    Route::get('task-details', [TaskDetailController::class, 'listAll']);
    Route::apiResource('task-details', TaskDetailController::class)->only(['update', 'destroy']);

    // Construction Logs
    Route::apiResource('construction-logs', ConstructionLogController::class);

    // Sub Contractor Contract Addendums
    Route::get('sub-contracts/{sub_contract}/addendums', [SubContractAddendumController::class, 'index']);
    Route::post('sub-contracts/{sub_contract}/addendums', [SubContractAddendumController::class, 'store']);
    Route::apiResource('sub-contract-addendums', SubContractAddendumController::class)->only(['show', 'update', 'destroy']);

    // Project Documents Management
    Route::get('document-types', [ProjectDocumentController::class, 'documentTypes']);
    Route::get('project-documents/{id}/download', [ProjectDocumentController::class, 'download']);
    Route::patch('project-documents/{id}/status', [ProjectDocumentController::class, 'updateStatus']);
    Route::apiResource('project-documents', ProjectDocumentController::class);

    // Project Payments (Thu/Chi) Management
    Route::get('project-payments/stats', [ProjectPaymentController::class, 'getStats']);
    Route::apiResource('project-payments', ProjectPaymentController::class);

    // Notifications
    Route::get('notifications', [NotificationController::class, 'index']);
    Route::put('notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::put('notifications/read-all', [NotificationController::class, 'markAllAsRead']);
});
