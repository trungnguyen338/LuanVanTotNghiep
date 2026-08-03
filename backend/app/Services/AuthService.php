<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthService
{
    /**
     * Determines the login field type (email or username)
     */
    protected function getLoginField(string $loginId): string
    {
        return filter_var($loginId, FILTER_VALIDATE_EMAIL) ? 'email' : 'username';
    }

    /**
     * Authenticate and ensure user belongs to an internal/admin role
     */
    public function adminLogin(array $data): User
    {
        $user = $this->authenticate($data['login_id'], $data['password']);

        // Check if user has an admin/internal role or is a subcontractor
        // Assuming 'Khách hàng' is the only external role.
        if ($user->role && $user->role->name === 'Khách hàng') {
            throw ValidationException::withMessages([
                'login_id' => ['Bạn không có quyền truy cập vào cổng quản trị.'],
            ]);
        }

        return $user;
    }

    /**
     * Authenticate and ensure user is a customer
     */
    public function customerLogin(array $data): User
    {
        $user = $this->authenticate($data['login_id'], $data['password']);

        // Check if user is a Customer
        if (! $user->role || $user->role->name !== 'Khách hàng') {
            throw ValidationException::withMessages([
                'login_id' => ['Tài khoản này không phải là khách hàng.'],
            ]);
        }

        return $user;
    }

    /**
     * Helper to authenticate user by login_id and password
     */
    protected function authenticate(string $loginId, string $password): User
    {
        $field = $this->getLoginField($loginId);

        $user = User::with('role')->where($field, $loginId)->first();

        if (! $user || ! Hash::check($password, $user->password_hash)) {
            throw ValidationException::withMessages([
                'login_id' => ['Thông tin đăng nhập không chính xác.'],
            ]);
        }

        if ($user->status !== 1) {
            throw ValidationException::withMessages([
                'login_id' => ['Tài khoản của bạn đã bị khóa.'],
            ]);
        }

        return $user;
    }

    /**
     * Log the user out by revoking their current token
     */
    public function logout(User $user): void
    {
        $user->currentAccessToken()->delete();
    }
}
