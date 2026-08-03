<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\ProjectTask;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class ProjectTaskController extends Controller
{
    /**
     * Lấy danh sách loại hạng mục (task types)
     */
    public function getTypes(): JsonResponse
    {
        return response()->json(ProjectTask::getTypes());
    }

    /**
     * Danh sách hạng mục thi công lớn của dự án
     */
    public function index($projectId): JsonResponse
    {
        $project = Project::find($projectId);

        if (! $project) {
            return response()->json(['message' => 'Không tìm thấy dự án'], 404);
        }

        ProjectTask::where('project_id', $projectId)
            ->whereHas('details')
            ->pluck('id')
            ->each(function ($taskId) {
                ProjectTask::recalculateProgress($taskId);
            });

        $tasks = ProjectTask::with(['details.contractorDetail.subcontractor'])
            ->where('project_id', $projectId)
            ->orderBy('id', 'asc')
            ->get();

        return response()->json($tasks);
    }

    /**
     * Chi tiết hạng mục thi công lớn
     */
    public function show($id): JsonResponse
    {
        $task = ProjectTask::find($id);

        if (! $task) {
            return response()->json(['message' => 'Không tìm thấy hạng mục thi công lớn'], 404);
        }

        if ($task->details()->exists()) {
            ProjectTask::recalculateProgress($task->id);
        }

        $task = ProjectTask::with(['details.contractorDetail.subcontractor', 'project'])
            ->find($id);

        return response()->json($task);
    }

    /**
     * Lập hạng mục thi công lớn mới
     */
    public function store(Request $request, $projectId): JsonResponse
    {
        $project = Project::find($projectId);

        if (! $project) {
            return response()->json(['message' => 'Không tìm thấy dự án'], 404);
        }

        if ($project->getRawOriginal('status') === 'Đã hoàn thành') {
            return response()->json(['message' => 'Dự án đã hoàn thành, không thể thêm hạng mục mới.'], 400);
        }

        if ($project->getRawOriginal('status') === 'Tạm dừng') {
            return response()->json(['message' => 'Dự án đang tạm dừng (hợp đồng đã chấm dứt), không thể thêm hạng mục mới.'], 400);
        }

        $validator = Validator::make($request->all(), [
            'task_name' => 'required|string|max:255',
            'task_type' => ['required', Rule::in([
                ProjectTask::TYPE_CONSTRUCTION,
                ProjectTask::TYPE_TECHNICAL,
                'CONSTRUCTION',
                'TECHNICAL',
            ])],
            'billing_value' => 'nullable|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => $validator->errors()->first(), 'errors' => $validator->errors()], 422);
        }

        $task = new ProjectTask;
        $task->project_id = $projectId;
        $task->task_name = $request->task_name;
        $task->task_type = $request->task_type;
        $task->billing_value = $request->input('billing_value', 0);
        $task->status = 'TODO';
        $task->progress_percent = 0;
        $task->save();

        return response()->json([
            'message' => 'Tạo hạng mục thi công lớn thành công',
            'data' => $task,
        ], 201);
    }

    /**
     * Cập nhật hạng mục thi công lớn
     */
    public function update(Request $request, $id): JsonResponse
    {
        $task = ProjectTask::find($id);

        if (! $task) {
            return response()->json(['message' => 'Không tìm thấy hạng mục thi công lớn'], 404);
        }

        if ($task->project && $task->project->getRawOriginal('status') === 'Đã hoàn thành') {
            return response()->json(['message' => 'Dự án đã hoàn thành, không thể chỉnh sửa hoặc xóa hạng mục.'], 400);
        }

        // Nếu đã có công việc con nào được duyệt nghiệm thu, chặn cập nhật để tránh sai lệch dữ liệu thanh quyết toán
        $hasApprovedDetails = $task->details()->where('acceptance_status', 'Đã duyệt')->exists();
        if ($hasApprovedDetails) {
            return response()->json([
                'message' => 'Hạng mục thi công lớn này đã có công việc con được duyệt nghiệm thu, không thể chỉnh sửa.',
            ], 400);
        }

        $validator = Validator::make($request->all(), [
            'task_name' => 'required|string|max:255',
            'task_type' => ['required', Rule::in([
                ProjectTask::TYPE_CONSTRUCTION,
                ProjectTask::TYPE_TECHNICAL,
                'CONSTRUCTION',
                'TECHNICAL',
            ])],
            'status' => 'required|in:TODO,DOING,DONE',
            'progress_percent' => 'nullable|integer|min:0|max:100',
            'billing_value' => 'nullable|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => $validator->errors()->first(), 'errors' => $validator->errors()], 422);
        }

        $taskValue = $task->getEffectiveTaskValue(
            $request->has('billing_value') ? floatval($request->input('billing_value', 0)) : null
        );
        if ($task->details_total_value > $taskValue) {
            return response()->json([
                'message' => 'Giá trị hạng mục ('.number_format($taskValue).' VNĐ) không được nhỏ hơn tổng giá trị các công việc con hiện có ('.number_format($task->details_total_value).' VNĐ).',
            ], 400);
        }

        $task->task_name = $request->task_name;
        $task->task_type = $request->task_type;
        $task->billing_value = $request->input('billing_value', 0);

        // Chỉ cho phép cập nhật thủ công tiến độ khi hạng mục chưa có công việc con nào.
        // Nếu đã có công việc con, tiến độ sẽ tự động tính toán qua weighted average.
        // Tuy nhiên, trạng thái (status) của hạng mục lớn vẫn cho phép chỉnh sửa thủ công.
        $hasDetails = $task->details()->exists();
        if (! $hasDetails) {
            $task->progress_percent = $request->input('progress_percent', 0);
        }
        $task->status = $request->status;

        $task->save();

        return response()->json([
            'message' => 'Cập nhật hạng mục thi công lớn thành công',
            'data' => $task->load('project', 'details.contractorDetail.subcontractor'),
        ]);
    }

    /**
     * Xóa hạng mục thi công lớn
     */
    public function destroy($id): JsonResponse
    {
        $task = ProjectTask::find($id);

        if (! $task) {
            return response()->json(['message' => 'Không tìm thấy hạng mục thi công lớn'], 404);
        }

        if ($task->project && $task->project->getRawOriginal('status') === 'Đã hoàn thành') {
            return response()->json(['message' => 'Dự án đã hoàn thành, không thể chỉnh sửa hoặc xóa hạng mục.'], 400);
        }

        // Chặn xóa nếu có công việc con (task_details)
        $hasDetails = $task->details()->exists();
        if ($hasDetails) {
            return response()->json([
                'message' => 'Không thể xóa hạng mục này vì đã có các công việc cụ thể bên trong. Vui lòng xóa các công việc con trước.',
            ], 400);
        }

        // Chặn xóa nếu đã được duyệt nghiệm thu ở công việc con bất kỳ
        $hasApprovedDetails = $task->details()->where('acceptance_status', 'Đã duyệt')->exists();
        if ($hasApprovedDetails) {
            return response()->json([
                'message' => 'Hạng mục này đã có công việc con được duyệt nghiệm thu, không thể xóa để đảm bảo toàn vẹn dữ liệu.',
            ], 400);
        }

        $task->delete();

        return response()->json(['message' => 'Xóa hạng mục thi công lớn thành công']);
    }
}
