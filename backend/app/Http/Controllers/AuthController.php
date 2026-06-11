<?php

namespace App\Http\Controllers;

use App\Http\Requests\Auth\LoginRequest;
use App\Http\Resources\Auth\AuthResource;
use App\Services\AuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    protected AuthService $authService;

    public function __construct(AuthService $authService)
    {
        $this->authService = $authService;
    }

    /**
     * Login for Admin/Internal Staff and Subcontractors
     */
    public function adminLogin(LoginRequest $request): JsonResponse
    {
        $user = $this->authService->adminLogin($request->validated());
        
        $token = $user->createToken('admin-token')->plainTextToken;

        return response()->json([
            'message' => 'Đăng nhập thành công',
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => new AuthResource($user),
        ]);
    }

    /**
     * Login for Customers
     */
    public function customerLogin(LoginRequest $request): JsonResponse
    {
        $user = $this->authService->customerLogin($request->validated());
        
        $token = $user->createToken('customer-token')->plainTextToken;

        return response()->json([
            'message' => 'Đăng nhập thành công',
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => new AuthResource($user),
        ]);
    }

    /**
     * Logout
     */
    public function logout(Request $request): JsonResponse
    {
        $this->authService->logout($request->user());

        return response()->json([
            'message' => 'Đăng xuất thành công'
        ]);
    }
}
