<?php

namespace App\Http\Controllers;

use App\Models\ProjectTask;
use App\Models\TaskDetail;
use App\Services\TaskDetailService;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class TaskDetailController extends Controller
{
    protected $taskDetailService;

    public function __construct(TaskDetailService $taskDetailService)
    {
        $this->taskDetailService = $taskDetailService;
    }

    /**
     * Danh sách công việc cụ thể / giao khoán của hạng mục lớn
     */
    public function index($taskId): JsonResponse
    {
        $task = ProjectTask::find($taskId);

        if (! $task) {
            return response()->json(['message' => 'Không tìm thấy hạng mục lớn'], 404);
        }

        $details = TaskDetail::with(['contractorDetail.subcontractor'])
            ->where('project_task_id', $taskId)
            ->orderBy('id', 'asc')
            ->get();

        return response()->json($details);
    }

    /**
     * Thêm mới công việc cụ thể (giao khoán nhà thầu phụ)
     */
    public function store(Request $request, $taskId): JsonResponse
    {
        $task = ProjectTask::find($taskId);

        if (! $task) {
            return response()->json(['message' => 'Không tìm thấy hạng mục lớn'], 404);
        }

        if ($task->project && $task->project->getRawOriginal('status') === 'Đã hoàn thành') {
            return response()->json(['message' => 'Dự án đã hoàn thành, không thể thêm công việc mới.'], 400);
        }

        if ($task->project && $task->project->getRawOriginal('status') === 'Tạm dừng') {
            return response()->json(['message' => 'Dự án đang tạm dừng (hợp đồng đã chấm dứt), không thể thêm công việc mới.'], 400);
        }

        $validator = Validator::make($request->all(), [
            'contractor_detail_id' => 'required|exists:detail_contract_contractor,id',
            'detail_name' => 'required|string|max:255',
            'unit' => 'nullable|string|max:50',
            'work_volume' => 'required|numeric|min:0.01',
            'agreed_price' => 'required|numeric|min:0',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date|after_or_equal:today',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => $validator->errors()->first(), 'errors' => $validator->errors()], 422);
        }

        try {
            $detail = $this->taskDetailService->store($taskId, $request->all());

            return response()->json([
                'message' => 'Giao khoán công việc thành công',
                'data' => $detail->load('contractorDetail.subcontractor'),
            ], 201);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Lỗi hệ thống khi giao khoán công việc', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Cập nhật công việc cụ thể / tiến độ giao khoán
     */
    public function update(Request $request, $id): JsonResponse
    {
        $detail = TaskDetail::find($id);

        if (! $detail) {
            return response()->json(['message' => 'Không tìm thấy công việc giao khoán'], 404);
        }

        if ($detail->task && $detail->task->project && $detail->task->project->getRawOriginal('status') === 'Đã hoàn thành') {
            return response()->json(['message' => 'Dự án đã hoàn thành, không thể chỉnh sửa công việc.'], 400);
        }

        $user = $request->user();

        $rules = [
            'detail_name' => 'required|string|max:255',
            'unit' => 'nullable|string|max:50',
            'work_volume' => 'required|numeric|min:0.01',
            'agreed_price' => 'required|numeric|min:0',
            'progress_percent' => 'required|integer|min:0|max:100',
            'status' => 'required|in:TODO,DOING,DONE,ON_HOLD,Tạm dừng,CANCELLED',
            'acceptance_status' => 'required|in:NONE,PENDING,APPROVED,REJECTED',
            'rejection_note' => 'required_if:acceptance_status,REJECTED|nullable|string',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ];

        // Chỉ kiểm tra ngày tương lai khi ngày kết thúc dự kiến được thay đổi sang giá trị mới
        $newEndDate = $request->input('end_date') ? date('Y-m-d', strtotime($request->input('end_date'))) : null;
        $oldEndDate = $detail->end_date ? date('Y-m-d', strtotime($detail->end_date)) : null;
        if ($request->has('end_date') && $newEndDate !== $oldEndDate) {
            $rules['end_date'] .= '|after_or_equal:today';
        }

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return response()->json(['message' => $validator->errors()->first(), 'errors' => $validator->errors()], 422);
        }

        try {
            $updatedDetail = $this->taskDetailService->update($detail, $request->all(), $user);

            return response()->json([
                'message' => 'Cập nhật công việc giao khoán thành công',
                'data' => $updatedDetail->load(['contractorDetail.subcontractor']),
            ]);
        } catch (AuthorizationException $e) {
            return response()->json(['message' => $e->getMessage()], 403);
        } catch (ValidationException $e) {
            return response()->json(['message' => $e->errors() ? collect($e->errors())->flatten()->first() : 'Dữ liệu không hợp lệ', 'errors' => $e->errors()], 422);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Lỗi hệ thống khi cập nhật công việc', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Xóa công việc giao khoán
     */
    public function destroy($id): JsonResponse
    {
        $detail = TaskDetail::find($id);

        if (! $detail) {
            return response()->json(['message' => 'Không tìm thấy công việc giao khoán'], 404);
        }

        if ($detail->task && $detail->task->project && $detail->task->project->getRawOriginal('status') === 'Đã hoàn thành') {
            return response()->json(['message' => 'Dự án đã hoàn thành, không thể xóa công việc.'], 400);
        }

        try {
            $this->taskDetailService->destroy($detail);

            return response()->json(['message' => 'Xóa công việc giao khoán thành công']);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Lỗi hệ thống khi xóa công việc', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Gửi yêu cầu nghiệm thu khối lượng đến ban quản lý dự án
     */
    public function requestAcceptance(Request $request, $id): JsonResponse
    {
        $detail = TaskDetail::find($id);

        if (! $detail) {
            return response()->json(['message' => 'Không tìm thấy công việc giao khoán'], 404);
        }

        $user = $request->user();

        try {
            $updatedDetail = $this->taskDetailService->requestAcceptance($detail, $user);

            return response()->json([
                'message' => 'Gửi yêu cầu nghiệm thu thành công',
                'data' => $updatedDetail->load(['contractorDetail.subcontractor']),
            ]);
        } catch (AuthorizationException $e) {
            return response()->json(['message' => $e->getMessage()], 403);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Lỗi hệ thống khi gửi yêu cầu nghiệm thu', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Danh sách công việc con (TaskDetail) được giao cho nhà thầu phụ đang đăng nhập
     */
    public function myTasks(Request $request): JsonResponse
    {
        $user = $request->user();
        $subcontractor = $user->subcontractor;

        if (! $subcontractor) {
            return response()->json(['message' => 'Tài khoản này không phải là nhà thầu phụ.'], 403);
        }

        $tasks = TaskDetail::with(['task.project', 'contractorDetail'])
            ->whereHas('contractorDetail', function ($q) use ($subcontractor) {
                $q->where('subcontractor_id', $subcontractor->id);
            })
            ->orderBy('id', 'desc')
            ->get();

        // Định dạng dữ liệu trả về giống cấu trúc frontend mong muốn
        $formattedTasks = $tasks->map(function ($detail) {
            // Tính lũy kế khối lượng từ nhật ký thi công
            $accumulatedVolume = $detail->logs()->sum('daily_volume');
            // Đồng bộ lũy kế khối lượng theo tiến độ nếu không có nhật ký hoặc tiến độ cao hơn
            $accumulatedVolume = max(floatval($accumulatedVolume), (floatval($detail->progress_percent) / 100) * floatval($detail->work_volume));

            return [
                'id' => $detail->id,
                'detail_name' => $detail->detail_name,
                'unit' => $detail->unit,
                'work_volume' => $detail->work_volume,
                'agreed_price' => $detail->agreed_price,
                'total_value' => $detail->total_value,
                'committed_value' => $detail->committed_value,
                'remaining_work_volume' => $detail->remaining_work_volume,
                'remaining_work_value' => $detail->remaining_work_value,
                'accumulated_volume' => $accumulatedVolume,
                'progress_percent' => $detail->progress_percent,
                'status' => $detail->status,
                'acceptance_status' => $detail->acceptance_status,
                'rejection_note' => $detail->rejection_note,
                'start_date' => $detail->start_date,
                'end_date' => $detail->end_date,
                'parent_task_name' => $detail->task ? $detail->task->task_name : null,
                'project_id' => $detail->task ? $detail->task->project_id : null,
                'project_name' => ($detail->task && $detail->task->project) ? $detail->task->project->name : null,
                'project_start_date' => ($detail->task && $detail->task->project) ? $detail->task->project->start_date : null,
                'project_end_date' => ($detail->task && $detail->task->project) ? $detail->task->project->expected_end_date : null,
            ];
        });

        return response()->json($formattedTasks);
    }

    /**
     * Danh sách tất cả các công việc con (TaskDetail) phục vụ cho việc nghiệm thu của Admin
     */
    public function listAll(Request $request): JsonResponse
    {
        $query = TaskDetail::with(['task.project.category', 'contractorDetail.subcontractor.user']);

        if ($request->has('acceptance_status')) {
            $status = $request->acceptance_status;
            $map = [
                'NONE' => 'Chưa nghiệm thu',
                'PENDING' => 'Chờ nghiệm thu',
                'APPROVED' => 'Đã duyệt',
                'REJECTED' => 'Bị từ chối',
            ];
            if (array_key_exists($status, $map)) {
                $query->where('acceptance_status', $map[$status]);
            } else {
                $query->where('acceptance_status', $status);
            }
        } else {
            // Mặc định trả về các yêu cầu nghiệm thu cần xử lý hoặc đã xử lý (PENDING, APPROVED, REJECTED)
            $query->whereIn('acceptance_status', ['Chờ nghiệm thu', 'Đã duyệt', 'Bị từ chối']);
        }

        $details = $query->orderBy('id', 'desc')->get();

        return response()->json($details);
    }
}
