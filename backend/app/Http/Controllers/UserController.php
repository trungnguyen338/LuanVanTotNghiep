<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\DetailContractContractor;
use App\Models\Project;
use App\Models\Subcontractor;
use App\Models\User;
use App\Services\UsernameService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class UserController extends Controller
{
    protected UsernameService $usernameService;

    public function __construct(UsernameService $usernameService)
    {
        $this->usernameService = $usernameService;
    }

    /**
     * Lấy danh sách tài khoản (users)
     */
    public function index(Request $request): JsonResponse
    {
        $query = User::with('role');

        if ($request->input('type') === 'internal') {
            // Chỉ lấy các tài khoản Quản trị viên phục vụ việc chọn người giám sát
            $query->whereHas('role', function ($q) {
                $q->whereIn('name', ['Quản trị viên', 'Admin']);
            });
        } else {
            // Mặc định lấy danh sách tài khoản Khách hàng & Nhà thầu phụ
            $query->whereHas('role', function ($q) {
                $q->whereIn('name', ['Khách hàng', 'Nhà thầu phụ']);
            });
        }

        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
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
     * Thêm mới tài khoản
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email' => [
                'required',
                'email',
                'ends_with:@gmail.com',
                'max:255',
                'unique:users',
                'regex:/^[^ÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]*$/u'
            ],
            'full_name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:255',
            'address' => 'nullable|string',
            'password' => 'required|string|min:6',
            'role_id' => 'required|exists:roles,id',
            'status' => 'required|boolean',
        ], [
            'email.ends_with' => 'Email phải có đuôi là @gmail.com.',
            'email.regex' => 'Email không được chứa ký tự có dấu.',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => $validator->errors()->first(), 'errors' => $validator->errors()], 422);
        }

        $user = new User;
        $user->username = $this->usernameService->generateFromEmail($request->email);
        $user->email = $request->email;
        $user->full_name = $request->full_name;
        $user->phone = $request->phone;
        $user->address = $request->address;
        $user->password_hash = Hash::make($request->password);
        $user->role_id = $request->role_id;
        $user->status = $request->status;
        $user->save();

        $user->load('role');

        if ($user->role) {
            if ($user->role->name === 'Khách hàng') {
                $customer = new Customer;
                $customer->user_id = $user->id;
                $customer->status = $user->status;
                $customer->customer_code = 'TEMP-'.str_pad(mt_rand(0, 99999), 5, '0', STR_PAD_LEFT);
                $customer->save();

                $customer->customer_code = 'CUS-'.str_pad($customer->id, 4, '0', STR_PAD_LEFT);
                $customer->save();
            } elseif ($user->role->name === 'Nhà thầu phụ') {
                $subcontractor = new Subcontractor;
                $subcontractor->user_id = $user->id;
                $subcontractor->status = $user->status;
                $subcontractor->subcontractor_code = 'TEMP-'.str_pad(mt_rand(0, 99999), 5, '0', STR_PAD_LEFT);
                $subcontractor->save();

                $subcontractor->subcontractor_code = 'SUB-'.str_pad($subcontractor->id, 4, '0', STR_PAD_LEFT);
                $subcontractor->save();
            }
        }

        return response()->json(['message' => 'Tạo tài khoản thành công', 'user' => $user], 201);
    }

    /**
     * Cập nhật thông tin tài khoản
     */
    public function update(Request $request, $id): JsonResponse
    {
        $user = User::find($id);

        if (! $user) {
            return response()->json(['message' => 'Không tìm thấy tài khoản'], 404);
        }

        $validator = Validator::make($request->all(), [
            'email' => [
                'required',
                'email',
                'ends_with:@gmail.com',
                'max:255',
                'unique:users,email,'.$id,
                'regex:/^[^ÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]*$/u'
            ],
            'full_name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:255',
            'address' => 'nullable|string',
            'password' => 'nullable|string|min:6',
            'role_id' => 'required|exists:roles,id',
            'status' => 'required|boolean',
        ], [
            'email.ends_with' => 'Email phải có đuôi là @gmail.com.',
            'email.regex' => 'Email không được chứa ký tự có dấu.',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => $validator->errors()->first(), 'errors' => $validator->errors()], 422);
        }

        $user->username = $this->usernameService->generateFromEmail($request->email, $user->id);
        $user->email = $request->email;
        $user->full_name = $request->full_name;
        $user->phone = $request->phone;
        $user->address = $request->address;
        $user->role_id = $request->role_id;
        $user->status = $request->status;

        if ($request->filled('password')) {
            $user->password_hash = Hash::make($request->password);
        }

        $user->save();
        $user->load('role');

        // Đồng bộ trạng thái với Khách hàng hoặc Nhà thầu phụ tương ứngenv
        if ($user->role) {
            if ($user->role->name === 'Khách hàng') {
                $exists = Customer::where('user_id', $user->id)->exists();
                if (! $exists) {
                    $customer = new Customer;
                    $customer->user_id = $user->id;
                    $customer->status = $user->status;
                    $customer->customer_code = 'TEMP-'.str_pad(mt_rand(0, 99999), 5, '0', STR_PAD_LEFT);
                    $customer->save();

                    $customer->customer_code = 'CUS-'.str_pad($customer->id, 4, '0', STR_PAD_LEFT);
                    $customer->save();
                } else {
                    Customer::where('user_id', $user->id)->update(['status' => $user->status]);
                }
            } elseif ($user->role->name === 'Nhà thầu phụ') {
                $exists = Subcontractor::where('user_id', $user->id)->exists();
                if (! $exists) {
                    $subcontractor = new Subcontractor;
                    $subcontractor->user_id = $user->id;
                    $subcontractor->status = $user->status;
                    $subcontractor->subcontractor_code = 'TEMP-'.str_pad(mt_rand(0, 99999), 5, '0', STR_PAD_LEFT);
                    $subcontractor->save();

                    $subcontractor->subcontractor_code = 'SUB-'.str_pad($subcontractor->id, 4, '0', STR_PAD_LEFT);
                    $subcontractor->save();
                } else {
                    Subcontractor::where('user_id', $user->id)->update(['status' => $user->status]);
                }
            }
        }

        return response()->json(['message' => 'Cập nhật tài khoản thành công', 'user' => $user]);
    }

    /**
     * Xóa hoặc vô hiệu hóa tài khoản
     */
    public function destroy($id): JsonResponse
    {
        $user = User::find($id);

        if (! $user) {
            return response()->json(['message' => 'Không tìm thấy tài khoản'], 404);
        }

        $user->load('role');

        if ($user->role) {
            if ($user->role->name === 'Khách hàng') {
                $customer = Customer::where('user_id', $user->id)->first();
                if ($customer) {
                    // Kiểm tra xem khách hàng có liên quan tới dự án nào không
                    $hasProjects = Project::where('customer_id', $customer->id)->exists();
                    if ($hasProjects) {
                        // Xóa mềm: Vô hiệu hóa
                        $user->status = 0;
                        $user->save();
                        $customer->status = 0;
                        $customer->save();

                        return response()->json(['message' => 'Tài khoản khách hàng đã được vô hiệu hóa (xóa mềm) do có dự án liên kết', 'action' => 'disabled']);
                    } else {
                        // Xóa cứng: Xóa hoàn toàn
                        $customer->delete();
                        $user->delete();

                        return response()->json(['message' => 'Tài khoản khách hàng đã được xóa hoàn toàn khỏi hệ thống', 'action' => 'deleted']);
                    }
                }
            } elseif ($user->role->name === 'Nhà thầu phụ') {
                $subcontractor = Subcontractor::where('user_id', $user->id)->first();
                if ($subcontractor) {
                    // Kiểm tra xem nhà thầu phụ có liên quan tới dự án nào không (thông qua bảng liên kết hợp đồng)
                    $hasContracts = DetailContractContractor::where('subcontractor_id', $subcontractor->id)->exists();
                    if ($hasContracts) {
                        // Xóa mềm: Vô hiệu hóa
                        $user->status = 0;
                        $user->save();
                        $subcontractor->status = 0;
                        $subcontractor->save();

                        return response()->json(['message' => 'Tài khoản nhà thầu phụ đã được vô hiệu hóa (xóa mềm) do có hợp đồng liên kết', 'action' => 'disabled']);
                    } else {
                        // Xóa cứng: Xóa hoàn toàn
                        $subcontractor->delete();
                        $user->delete();

                        return response()->json(['message' => 'Tài khoản nhà thầu phụ đã được xóa hoàn toàn khỏi hệ thống', 'action' => 'deleted']);
                    }
                }
            }
        }

        // Trường hợp tài khoản khác (ví dụ Quản trị viên)
        $user->status = 0;
        $user->save();

        return response()->json(['message' => 'Tài khoản đã được vô hiệu hóa thành công', 'action' => 'disabled']);
    }
}
