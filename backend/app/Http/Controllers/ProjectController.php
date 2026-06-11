<?php

namespace App\Http\Controllers;

use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ProjectController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Project::with(['category', 'customer'])
            ->withSum('clientContracts', 'contract_value')
            ->withAvg('tasks', 'progress_percent');

        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'LIKE', "%{$search}%")
                  ->orWhere('project_code', 'LIKE', "%{$search}%");
            });
        }

        $projects = $query->orderBy('id', 'desc')->get();

        // Xử lý lại kết quả trả về để đổi tên biến cho frontend dễ dùng
        $formattedProjects = $projects->map(function ($project) {
            $project->budget = $project->client_contracts_sum_contract_value ?? 0;
            $project->progress = round($project->tasks_avg_progress_percent ?? 0);
            return $project;
        });

        return response()->json($formattedProjects);
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'category_id' => 'required|exists:project_categories,id',
            'customer_id' => 'required|exists:customers,id',
            'supervisor_id' => 'required|exists:users,id',
            'address' => 'required|string',
            'start_date' => 'nullable|date',
            'expected_end_date' => 'nullable|date|after_or_equal:start_date',
            'status' => 'required|in:DRAFT,PENDING,PROCESSING,REVISION,COMPLETED,ON_HOLD'
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Dữ liệu không hợp lệ', 'errors' => $validator->errors()], 422);
        }

        // Sinh mã dự án (PRO-xxxx)
        $lastProject = Project::orderBy('id', 'desc')->first();
        $nextId = $lastProject ? $lastProject->id + 1 : 1;
        $projectCode = 'PRO-' . str_pad($nextId, 4, '0', STR_PAD_LEFT);

        $project = new Project();
        $project->project_code = $projectCode;
        $project->name = $request->name;
        $project->category_id = $request->category_id;
        $project->customer_id = $request->customer_id;
        $project->address = $request->address;
        $project->supervisor_id = $request->supervisor_id; 
        $project->start_date = $request->start_date;
        $project->expected_end_date = $request->expected_end_date;
        $project->status = $request->status;
        $project->save();

        return response()->json(['message' => 'Thêm dự án thành công', 'data' => $project], 201);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $project = Project::find($id);

        if (!$project) {
            return response()->json(['message' => 'Không tìm thấy dự án'], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'category_id' => 'required|exists:project_categories,id',
            'customer_id' => 'required|exists:customers,id',
            'supervisor_id' => 'required|exists:users,id',
            'address' => 'required|string',
            'start_date' => 'nullable|date',
            'expected_end_date' => 'nullable|date|after_or_equal:start_date',
            'status' => 'required|in:DRAFT,PENDING,PROCESSING,REVISION,COMPLETED,ON_HOLD'
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Dữ liệu không hợp lệ', 'errors' => $validator->errors()], 422);
        }

        $project->name = $request->name;
        $project->category_id = $request->category_id;
        $project->customer_id = $request->customer_id;
        $project->address = $request->address;
        $project->supervisor_id = $request->supervisor_id;
        $project->start_date = $request->start_date;
        $project->expected_end_date = $request->expected_end_date;
        $project->status = $request->status;
        $project->save();

        return response()->json(['message' => 'Cập nhật dự án thành công', 'data' => $project]);
    }

    public function destroy($id): JsonResponse
    {
        $project = Project::find($id);

        if (!$project) {
            return response()->json(['message' => 'Không tìm thấy dự án'], 404);
        }

        $project->status = 'ON_HOLD'; // Tạm ngưng
        $project->save();

        return response()->json(['message' => 'Đã chuyển dự án sang trạng thái Tạm ngưng']);
    }
}
