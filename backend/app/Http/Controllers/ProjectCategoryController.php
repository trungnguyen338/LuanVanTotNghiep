<?php

namespace App\Http\Controllers;

use App\Models\ProjectCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ProjectCategoryController extends Controller
{
    public function index(): JsonResponse
    {
        // Lấy danh sách danh mục và tự động đếm số lượng dự án thuộc danh mục đó
        $categories = ProjectCategory::withCount('projects')
            ->orderBy('id', 'desc')
            ->get();

        return response()->json($categories);
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:150',
            'status' => 'required|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => $validator->errors()->first(), 'errors' => $validator->errors()], 422);
        }

        // Tự động sinh mã danh mục (CAT-xxxx)
        $lastCategory = ProjectCategory::orderBy('id', 'desc')->first();
        $nextId = $lastCategory ? $lastCategory->id + 1 : 1;
        $categoryCode = 'CAT-'.str_pad($nextId, 4, '0', STR_PAD_LEFT);

        $category = new ProjectCategory;
        $category->category_code = $categoryCode;
        $category->name = $request->name;
        $category->status = $request->status;
        $category->save();

        return response()->json(['message' => 'Thêm danh mục thành công', 'data' => $category], 201);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $category = ProjectCategory::find($id);

        if (! $category) {
            return response()->json(['message' => 'Không tìm thấy danh mục'], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:150',
            'status' => 'required|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => $validator->errors()->first(), 'errors' => $validator->errors()], 422);
        }

        $category->name = $request->name;
        $category->status = $request->status;
        $category->save();

        return response()->json(['message' => 'Cập nhật danh mục thành công', 'data' => $category]);
    }

    public function destroy($id): JsonResponse
    {
        $category = ProjectCategory::find($id);

        if (! $category) {
            return response()->json(['message' => 'Không tìm thấy danh mục'], 404);
        }

        if ($category->projects()->exists()) {
            return response()->json([
                'message' => 'Danh mục đã được sử dụng trong dự án, không thể xóa.',
            ], 400);
        }

        // Bảng project_categories không còn deleted_at nên xóa vĩnh viễn luôn nếu chưa được dùng
        $category->delete();

        return response()->json([
            'message' => 'Đã xóa danh mục thành công',
            'deleted_type' => 'hard'
        ]);
    }
}
