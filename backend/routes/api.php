<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\AuthController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\SubcontractorController;
use App\Http\Controllers\SupplierController;
use App\Http\Controllers\ProjectCategoryController;
use App\Http\Controllers\ProjectController;

Route::prefix('auth')->group(function () {
    Route::post('admin/login', [AuthController::class, 'adminLogin']);
    Route::post('customer/login', [AuthController::class, 'customerLogin']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('logout', [AuthController::class, 'logout']);
        Route::get('me', function (Request $request) {
            return new \App\Http\Resources\Auth\AuthResource($request->user()->load('role'));
        });
    });
});

Route::middleware('auth:sanctum')->group(function () {
    Route::get('roles', [RoleController::class, 'index']);
    Route::apiResource('users', UserController::class);
    
    // Partner Management
    Route::apiResource('customers', CustomerController::class);
    Route::apiResource('subcontractors', SubcontractorController::class);
    Route::apiResource('suppliers', SupplierController::class);

    // Project Categories
    Route::apiResource('project-categories', ProjectCategoryController::class);

    // Projects
    Route::apiResource('projects', ProjectController::class);
});
