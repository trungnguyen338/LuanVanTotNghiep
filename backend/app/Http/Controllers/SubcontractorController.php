<?php

namespace App\Http\Controllers;

use App\Models\Role;
use App\Models\Subcontractor;
use App\Models\User;
use App\Services\UsernameService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class SubcontractorController extends Controller
{
    protected UsernameService $usernameService;

    public function __construct(UsernameService $usernameService)
    {
        $this->usernameService = $usernameService;
    }

    public function index(Request $request): JsonResponse
    {
        $query = Subcontractor::query();

        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('subcontractor_code', 'LIKE', "%{$search}%")
                    ->orWhereHas('user', function ($userQuery) use ($search) {
                        $userQuery->where('full_name', 'LIKE', "%{$search}%")
                            ->orWhere('email', 'LIKE', "%{$search}%")
                            ->orWhere('phone', 'LIKE', "%{$search}%")
                            ->orWhere('address', 'LIKE', "%{$search}%");
                    });
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
            'email' => [
                'required',
                'email',
                'ends_with:@gmail.com',
                'max:100',
                'unique:users,email',
                'regex:/^[^ÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]*$/u'
            ],
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string',
            'status' => 'required|boolean',
        ], [
            'email.ends_with' => 'Email phải có đuôi là @gmail.com.',
            'email.regex' => 'Email không được chứa ký tự có dấu.',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => $validator->errors()->first(), 'errors' => $validator->errors()], 422);
        }

        // Đảm bảo chức vụ Nhà thầu phụ tồn tại
        $role = Role::firstOrCreate(
            ['name' => 'Nhà thầu phụ'],
            ['permissions' => json_encode([]), 'status' => 1]
        );

        // Tự động tạo tài khoản đăng nhập (Bắt buộc theo phương án A)
        $user = new User;
        $user->username = $this->usernameService->generateFromEmail($request->email);
        $user->email = $request->email;
        $user->full_name = $request->name;
        $user->phone = $request->phone;
        $user->address = $request->address;
        $user->password_hash = Hash::make('123456');
        $user->role_id = $role->id;
        $user->status = $request->status;
        $user->save();

        // Tự động sinh mã nhà thầu phụ đồng bộ với database auto-increment ID
        $subcontractor = new Subcontractor;
        $subcontractor->user_id = $user->id;
        $subcontractor->subcontractor_code = 'TEMP-'.str_pad(mt_rand(0, 99999), 5, '0', STR_PAD_LEFT);
        $subcontractor->status = $request->status;
        $subcontractor->save();

        $subcontractor->subcontractor_code = 'SUB-'.str_pad($subcontractor->id, 4, '0', STR_PAD_LEFT);
        $subcontractor->save();

        return response()->json(['message' => 'Thêm nhà thầu phụ thành công', 'data' => $subcontractor], 201);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $subcontractor = Subcontractor::find($id);

        if (! $subcontractor) {
            return response()->json(['message' => 'Không tìm thấy nhà thầu'], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:150',
            'email' => [
                'required',
                'email',
                'ends_with:@gmail.com',
                'max:100',
                'unique:users,email,'.$subcontractor->user_id,
                'regex:/^[^ÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]*$/u'
            ],
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string',
            'status' => 'required|boolean',
        ], [
            'email.ends_with' => 'Email phải có đuôi là @gmail.com.',
            'email.regex' => 'Email không được chứa ký tự có dấu.',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => $validator->errors()->first(), 'errors' => $validator->errors()], 422);
        }

        // Cập nhật thông tin tài khoản đăng nhập
        if ($subcontractor->user) {
            $user = $subcontractor->user;
            $user->full_name = $request->name;
            $user->email = $request->email;
            $user->username = $this->usernameService->generateFromEmail($request->email, $user->id);
            $user->phone = $request->phone;
            $user->address = $request->address;
            $user->status = $request->status;
            $user->save();
        }

        $subcontractor->status = $request->status;
        $subcontractor->save();

        return response()->json(['message' => 'Cập nhật nhà thầu phụ thành công', 'data' => $subcontractor]);
    }

    public function destroy($id): JsonResponse
    {
        $subcontractor = Subcontractor::find($id);

        if (! $subcontractor) {
            return response()->json(['message' => 'Không tìm thấy nhà thầu'], 404);
        }

        $subcontractor->status = 0; // Vô hiệu hóa
        $subcontractor->save();

        // Đồng bộ vô hiệu hóa tài khoản liên kết
        if ($subcontractor->user) {
            $user = $subcontractor->user;
            $user->status = 0;
            $user->save();
        }

        return response()->json(['message' => 'Đã vô hiệu hóa nhà thầu phụ']);
    }
}
