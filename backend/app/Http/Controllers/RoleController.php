<?php

namespace App\Http\Controllers;

use App\Models\Role;
use Illuminate\Http\JsonResponse;

class RoleController extends Controller
{
    /**
     * Lấy danh sách chức vụ/vai trò
     */
    public function index(): JsonResponse
    {
        $roles = Role::where('status', 1)
            ->whereIn('name', ['Khách hàng', 'Nhà thầu phụ'])
            ->get();

        return response()->json($roles);
    }
}
