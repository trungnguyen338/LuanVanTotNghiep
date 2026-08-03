<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Role;
use App\Models\User;
use App\Services\UsernameService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class CustomerController extends Controller
{
    protected UsernameService $usernameService;

    public function __construct(UsernameService $usernameService)
    {
        $this->usernameService = $usernameService;
    }

    public function index(Request $request): JsonResponse
    {
        $query = Customer::query();

        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('customer_code', 'LIKE', "%{$search}%")
                    ->orWhereHas('user', function ($userQuery) use ($search) {
                        $userQuery->where('full_name', 'LIKE', "%{$search}%")
                            ->orWhere('email', 'LIKE', "%{$search}%")
                            ->orWhere('phone', 'LIKE', "%{$search}%")
                            ->orWhere('address', 'LIKE', "%{$search}%");
                    });
            });
        }

        if ($request->has('status')) {
            $status = $request->input('status');
            $query->whereHas('user', function ($userQuery) use ($status) {
                $userQuery->where('status', $status);
            });
        }

        $customers = $query->orderBy('id', 'desc')->get();

        return response()->json($customers);
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'full_name' => 'required|string|max:150',
            'email' => [
                'required',
                'email',
                'ends_with:@gmail.com',
                'max:191',
                'unique:users,email',
                'regex:/^[^ÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]*$/u'
            ],
            'phone' => 'required|string|max:20',
            'address' => 'nullable|string',
            'status' => 'required|boolean',
        ], [
            'email.ends_with' => 'Email phải có đuôi là @gmail.com.',
            'email.regex' => 'Email không được chứa ký tự có dấu.',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => $validator->errors()->first(), 'errors' => $validator->errors()], 422);
        }

        // Đảm bảo chức vụ Khách hàng tồn tại
        $role = Role::firstOrCreate(
            ['name' => 'Khách hàng'],
            ['permissions' => json_encode([]), 'status' => 1]
        );

        // Tự động tạo tài khoản đăng nhập
        $user = new User;
        $user->username = $this->usernameService->generateFromEmail($request->email);
        $user->email = $request->email;
        $user->full_name = $request->full_name;
        $user->phone = $request->phone;
        $user->address = $request->address;
        $user->password_hash = Hash::make('123456');
        $user->role_id = $role->id;
        $user->status = $request->status;
        $user->save();

        // Tự động sinh mã khách hàng đồng bộ với database auto-increment ID
        $customer = new Customer;
        $customer->user_id = $user->id;
        $customer->status = $request->status;
        $customer->customer_code = 'TEMP-'.str_pad(mt_rand(0, 99999), 5, '0', STR_PAD_LEFT);
        $customer->save();

        $customer->customer_code = 'CUS-'.str_pad($customer->id, 4, '0', STR_PAD_LEFT);
        $customer->save();

        return response()->json(['message' => 'Thêm khách hàng thành công', 'data' => $customer], 201);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $customer = Customer::find($id);

        if (! $customer) {
            return response()->json(['message' => 'Không tìm thấy khách hàng'], 404);
        }

        $validator = Validator::make($request->all(), [
            'full_name' => 'required|string|max:150',
            'email' => [
                'required',
                'email',
                'ends_with:@gmail.com',
                'max:191',
                'unique:users,email,'.$customer->user_id,
                'regex:/^[^ÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]*$/u'
            ],
            'phone' => 'required|string|max:20',
            'address' => 'nullable|string',
            'status' => 'required|boolean',
        ], [
            'email.ends_with' => 'Email phải có đuôi là @gmail.com.',
            'email.regex' => 'Email không được chứa ký tự có dấu.',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => $validator->errors()->first(), 'errors' => $validator->errors()], 422);
        }

        // Đồng bộ thông tin vào bảng users
        if ($customer->user) {
            $user = $customer->user;
            $user->full_name = $request->full_name;
            $user->email = $request->email;
            $user->username = $this->usernameService->generateFromEmail($request->email, $user->id);
            $user->phone = $request->phone;
            $user->address = $request->address;
            $user->status = $request->status;
            $user->save();
        }

        $customer->status = $request->status;
        $customer->save();

        return response()->json(['message' => 'Cập nhật khách hàng thành công', 'data' => $customer]);
    }

    public function destroy($id): JsonResponse
    {
        $customer = Customer::find($id);

        if (! $customer) {
            return response()->json(['message' => 'Không tìm thấy khách hàng'], 404);
        }

        // Vô hiệu hóa tài khoản liên kết
        if ($customer->user) {
            $user = $customer->user;
            $user->status = 0;
            $user->save();
        }

        $customer->status = 0;
        $customer->save();

        return response()->json(['message' => 'Đã vô hiệu hóa khách hàng']);
    }
}
