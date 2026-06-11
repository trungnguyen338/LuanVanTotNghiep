<?php

namespace App\Http\Controllers;

use App\Models\Role;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RoleController extends Controller
{
    /**
     * Lấy danh sách chức vụ/vai trò
     */
    public function index(): JsonResponse
    {
        $roles = Role::where('status', 1)->get();
        return response()->json($roles);
    }
}
