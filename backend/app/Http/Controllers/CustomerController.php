<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\User;
use App\Models\Role;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class CustomerController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Customer::query();

        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where(function($q) use ($search) {
                $q->where('full_name', 'LIKE', "%{$search}%")
                  ->orWhere('customer_code', 'LIKE', "%{$search}%")
                  ->orWhere('email', 'LIKE', "%{$search}%")
                  ->orWhere('phone', 'LIKE', "%{$search}%");
            });
        }

        if ($request->has('status')) {
            $query->where('status', $request->input('status'));
        }

        $customers = $query->orderBy('id', 'desc')->get();

        return response()->json($customers);
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'full_name' => 'required|string|max:150',
            'email' => 'required|email|max:191|unique:customers',
            'phone' => 'required|string|max:20',
            'address' => 'nullable|string',
            'status' => 'required|boolean'
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Dữ liệu không hợp lệ', 'errors' => $validator->errors()], 422);
        }

        // Tự động sinh mã khách hàng
        $lastCustomer = Customer::orderBy('id', 'desc')->first();
        $nextId = $lastCustomer ? $lastCustomer->id + 1 : 1;
        $customerCode = 'CUS-' . str_pad($nextId, 4, '0', STR_PAD_LEFT);

        // Đảm bảo chức vụ Khách hàng tồn tại
        $role = Role::firstOrCreate(
            ['name' => 'Khách hàng'],
            ['permissions' => json_encode([]), 'level' => 3, 'status' => 1]
        );

        // Tự động tạo tài khoản đăng nhập
        $user = new User();
        $user->username = $request->email; // Đăng nhập bằng Gmail/Email
        $user->email = $request->email;
        $user->full_name = $request->full_name;
        $user->phone = $request->phone;
        $user->password_hash = Hash::make('123456');
        $user->role_id = $role->id;
        $user->status = 1;
        $user->save();

        $customer = new Customer();
        $customer->user_id = $user->id;
        $customer->customer_code = $customerCode;
        $customer->full_name = $request->full_name;
        $customer->email = $request->email;
        $customer->phone = $request->phone;
        $customer->address = $request->address;
        $customer->status = $request->status;
        $customer->save();

        return response()->json(['message' => 'Thêm khách hàng thành công', 'data' => $customer], 201);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $customer = Customer::find($id);

        if (!$customer) {
            return response()->json(['message' => 'Không tìm thấy khách hàng'], 404);
        }

        $validator = Validator::make($request->all(), [
            'full_name' => 'required|string|max:150',
            'email' => 'required|email|max:191|unique:customers,email,' . $id,
            'phone' => 'required|string|max:20',
            'address' => 'nullable|string',
            'status' => 'required|boolean'
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Dữ liệu không hợp lệ', 'errors' => $validator->errors()], 422);
        }

        $customer->full_name = $request->full_name;
        $customer->email = $request->email;
        $customer->phone = $request->phone;
        $customer->address = $request->address;
        $customer->status = $request->status;
        $customer->save();

        return response()->json(['message' => 'Cập nhật khách hàng thành công', 'data' => $customer]);
    }

    public function destroy($id): JsonResponse
    {
        $customer = Customer::find($id);

        if (!$customer) {
            return response()->json(['message' => 'Không tìm thấy khách hàng'], 404);
        }

        $customer->status = 0; // Vô hiệu hóa
        $customer->save();

        return response()->json(['message' => 'Đã vô hiệu hóa khách hàng']);
    }
}
