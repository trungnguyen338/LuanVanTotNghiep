<?php

namespace App\Http\Controllers;

use App\Models\Subcontractor;
use App\Models\User;
use App\Models\Role;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class SubcontractorController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Subcontractor::query();

        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where(function($q) use ($search) {
                $q->where('name', 'LIKE', "%{$search}%")
                  ->orWhere('subcontractor_code', 'LIKE', "%{$search}%")
                  ->orWhere('email', 'LIKE', "%{$search}%")
                  ->orWhere('phone', 'LIKE', "%{$search}%");
            });
        }

        if ($request->has('status')) {
            $query->where('status', $request->input('status'));
        }

        $subcontractors = $query->orderBy('id', 'desc')->get();

        return response()->json($subcontractors);
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:150',
            'email' => 'nullable|email|max:100',
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string',
            'status' => 'required|in:ACTIVE,SUSPENDED,PENDING'
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Dữ liệu không hợp lệ', 'errors' => $validator->errors()], 422);
        }

        // Tự động sinh mã nhà thầu phụ
        $lastSub = Subcontractor::orderBy('id', 'desc')->first();
        $nextId = $lastSub ? $lastSub->id + 1 : 1;
        $subCode = 'SUB-' . str_pad($nextId, 4, '0', STR_PAD_LEFT);

        // Đảm bảo chức vụ Nhà thầu phụ tồn tại
        $role = Role::firstOrCreate(
            ['name' => 'Nhà thầu phụ'],
            ['permissions' => json_encode([]), 'level' => 3, 'status' => 1]
        );

        // Tự động tạo tài khoản đăng nhập nếu có email
        $userId = null;
        if ($request->email) {
            $user = new User();
            $user->username = $request->email; // Đăng nhập bằng Gmail/Email
            $user->email = $request->email;
            $user->full_name = $request->name;
            $user->phone = $request->phone;
            $user->password_hash = Hash::make('123456');
            $user->role_id = $role->id;
            $user->status = 1;
            $user->save();
            $userId = $user->id;
        }

        $subcontractor = new Subcontractor();
        $subcontractor->user_id = $userId;
        $subcontractor->subcontractor_code = $subCode;
        $subcontractor->name = $request->name;
        $subcontractor->email = $request->email;
        $subcontractor->phone = $request->phone;
        $subcontractor->address = $request->address;
        $subcontractor->status = $request->status;
        $subcontractor->save();

        return response()->json(['message' => 'Thêm nhà thầu phụ thành công', 'data' => $subcontractor], 201);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $subcontractor = Subcontractor::find($id);

        if (!$subcontractor) {
            return response()->json(['message' => 'Không tìm thấy nhà thầu'], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:150',
            'email' => 'nullable|email|max:100',
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string',
            'status' => 'required|in:ACTIVE,SUSPENDED,PENDING'
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Dữ liệu không hợp lệ', 'errors' => $validator->errors()], 422);
        }

        $subcontractor->name = $request->name;
        $subcontractor->email = $request->email;
        $subcontractor->phone = $request->phone;
        $subcontractor->address = $request->address;
        $subcontractor->status = $request->status;
        $subcontractor->save();

        return response()->json(['message' => 'Cập nhật nhà thầu phụ thành công', 'data' => $subcontractor]);
    }

    public function destroy($id): JsonResponse
    {
        $subcontractor = Subcontractor::find($id);

        if (!$subcontractor) {
            return response()->json(['message' => 'Không tìm thấy nhà thầu'], 404);
        }

        $subcontractor->status = 'SUSPENDED'; // Vô hiệu hóa
        $subcontractor->save();

        return response()->json(['message' => 'Đã vô hiệu hóa nhà thầu phụ']);
    }
}
