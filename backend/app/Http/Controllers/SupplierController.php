<?php

namespace App\Http\Controllers;

use App\Models\Supplier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class SupplierController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Supplier::query();

        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where(function($q) use ($search) {
                $q->where('name', 'LIKE', "%{$search}%")
                  ->orWhere('tax_code', 'LIKE', "%{$search}%")
                  ->orWhere('email', 'LIKE', "%{$search}%")
                  ->orWhere('phone', 'LIKE', "%{$search}%");
            });
        }

        if ($request->has('status')) {
            $query->where('status', $request->input('status'));
        }

        $suppliers = $query->orderBy('id', 'desc')->get();

        return response()->json($suppliers);
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:191',
            'tax_code' => 'nullable|string|max:191',
            'email' => 'nullable|email|max:191',
            'phone' => 'nullable|string|max:191',
            'address' => 'nullable|string|max:191',
            'status' => 'required|boolean'
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Dữ liệu không hợp lệ', 'errors' => $validator->errors()], 422);
        }

        $supplier = new Supplier();
        $supplier->name = $request->name;
        $supplier->tax_code = $request->tax_code;
        $supplier->email = $request->email;
        $supplier->phone = $request->phone;
        $supplier->address = $request->address;
        $supplier->status = $request->status;
        $supplier->save();

        return response()->json(['message' => 'Thêm nhà cung cấp thành công', 'data' => $supplier], 201);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $supplier = Supplier::find($id);

        if (!$supplier) {
            return response()->json(['message' => 'Không tìm thấy nhà cung cấp'], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:191',
            'tax_code' => 'nullable|string|max:191',
            'email' => 'nullable|email|max:191',
            'phone' => 'nullable|string|max:191',
            'address' => 'nullable|string|max:191',
            'status' => 'required|boolean'
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Dữ liệu không hợp lệ', 'errors' => $validator->errors()], 422);
        }

        $supplier->name = $request->name;
        $supplier->tax_code = $request->tax_code;
        $supplier->email = $request->email;
        $supplier->phone = $request->phone;
        $supplier->address = $request->address;
        $supplier->status = $request->status;
        $supplier->save();

        return response()->json(['message' => 'Cập nhật nhà cung cấp thành công', 'data' => $supplier]);
    }

    public function destroy($id): JsonResponse
    {
        $supplier = Supplier::find($id);

        if (!$supplier) {
            return response()->json(['message' => 'Không tìm thấy nhà cung cấp'], 404);
        }

        $supplier->status = 0; // Vô hiệu hóa
        $supplier->save();

        return response()->json(['message' => 'Đã vô hiệu hóa nhà cung cấp']);
    }
}
