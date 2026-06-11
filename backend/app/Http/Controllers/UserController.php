<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class UserController extends Controller
{
    /**
     * Lấy danh sách nhân sự (users)
     */
    public function index(Request $request): JsonResponse
    {
        $query = User::with('role');

        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where(function($q) use ($search) {
                $q->where('full_name', 'LIKE', "%{$search}%")
                  ->orWhere('email', 'LIKE', "%{$search}%")
                  ->orWhere('phone', 'LIKE', "%{$search}%");
            });
        }

        if ($request->has('role_id')) {
            $query->where('role_id', $request->input('role_id'));
        }

        $users = $query->orderBy('id', 'desc')->get();

        return response()->json($users);
    }

    /**
     * Thêm mới nhân sự
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'username' => 'required|string|max:50|unique:users',
            'email' => 'required|email|max:255|unique:users',
            'full_name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:255',
            'password' => 'required|string|min:6',
            'role_id' => 'required|exists:roles,id',
            'status' => 'required|boolean'
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Dữ liệu không hợp lệ', 'errors' => $validator->errors()], 422);
        }

        $user = new User();
        $user->username = $request->username;
        $user->email = $request->email;
        $user->full_name = $request->full_name;
        $user->phone = $request->phone;
        $user->password_hash = Hash::make($request->password);
        $user->role_id = $request->role_id;
        $user->status = $request->status;
        $user->save();

        $user->load('role');

        return response()->json(['message' => 'Thêm nhân sự thành công', 'user' => $user], 201);
    }

    /**
     * Cập nhật thông tin nhân sự
     */
    public function update(Request $request, $id): JsonResponse
    {
        $user = User::find($id);

        if (!$user) {
            return response()->json(['message' => 'Không tìm thấy nhân viên'], 404);
        }

        $validator = Validator::make($request->all(), [
            'username' => 'required|string|max:50|unique:users,username,' . $id,
            'email' => 'required|email|max:255|unique:users,email,' . $id,
            'full_name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:255',
            'password' => 'nullable|string|min:6',
            'role_id' => 'required|exists:roles,id',
            'status' => 'required|boolean'
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Dữ liệu không hợp lệ', 'errors' => $validator->errors()], 422);
        }

        $user->username = $request->username;
        $user->email = $request->email;
        $user->full_name = $request->full_name;
        $user->phone = $request->phone;
        $user->role_id = $request->role_id;
        $user->status = $request->status;

        if ($request->filled('password')) {
            $user->password_hash = Hash::make($request->password);
        }

        $user->save();
        $user->load('role');

        return response()->json(['message' => 'Cập nhật nhân sự thành công', 'user' => $user]);
    }

    /**
     * Xóa/Vô hiệu hóa nhân sự
     */
    public function destroy($id): JsonResponse
    {
        $user = User::find($id);

        if (!$user) {
            return response()->json(['message' => 'Không tìm thấy nhân viên'], 404);
        }

        // Vô hiệu hóa thay vì xóa
        $user->status = 0;
        $user->save();

        return response()->json(['message' => 'Đã chuyển nhân viên sang trạng thái Đã nghỉ việc']);
    }
}
