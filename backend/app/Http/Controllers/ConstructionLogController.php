<?php

namespace App\Http\Controllers;

use App\Models\ConstructionLog;
use App\Models\ConstructionLogImage;
use App\Models\ProjectTask;
use App\Models\TaskDetail;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class ConstructionLogController extends Controller
{
    /**
     * Danh sách nhật ký thi công
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $subcontractor = $user->subcontractor;

        $query = ConstructionLog::with('images', 'taskDetail.contractorDetail.subcontractor');

        // Phân quyền: Nhà thầu phụ chỉ xem được nhật ký của công việc được giao
        if ($user->role && $user->role->name === 'Nhà thầu phụ') {
            if (! $subcontractor) {
                return response()->json(['message' => 'Không tìm thấy thông tin nhà thầu phụ liên kết với tài khoản này.'], 403);
            }
            $query->whereHas('taskDetail.contractorDetail', function ($q) use ($subcontractor) {
                $q->where('subcontractor_id', $subcontractor->id);
            });
        }

        // Lọc theo task_detail_id
        if ($request->has('task_detail_id')) {
            $taskDetailId = $request->task_detail_id;
            $taskDetail = TaskDetail::find($taskDetailId);

            if (! $taskDetail) {
                return response()->json(['message' => 'Không tìm thấy công việc giao khoán'], 404);
            }

            if ($user->role && $user->role->name === 'Nhà thầu phụ') {
                if (! $subcontractor || ! $taskDetail->contractorDetail || $taskDetail->contractorDetail->subcontractor_id !== $subcontractor->id) {
                    return response()->json(['message' => 'Bạn không có quyền truy cập nhật ký của công việc này.'], 403);
                }
            }

            $query->where('task_detail_id', $taskDetailId);
        }

        // Lọc theo project_task_id (hạng mục lớn)
        if ($request->has('project_task_id')) {
            $projectTaskId = $request->project_task_id;
            $query->whereHas('taskDetail', function ($q) use ($projectTaskId) {
                $q->where('project_task_id', $projectTaskId);
            });
        }

        $logs = $query->orderBy('created_at', 'desc')->get();

        return response()->json($logs);
    }

    /**
     * Lấy chi tiết một nhật ký thi công
     */
    public function show(Request $request, $id): JsonResponse
    {
        $log = ConstructionLog::with('images', 'taskDetail.contractorDetail.subcontractor')->find($id);

        if (! $log) {
            return response()->json(['message' => 'Không tìm thấy nhật ký thi công'], 404);
        }

        $user = $request->user();
        if ($user->role && $user->role->name === 'Nhà thầu phụ') {
            $subcontractor = $user->subcontractor;
            $taskDetail = $log->taskDetail;
            if (! $subcontractor || ! $taskDetail->contractorDetail || $taskDetail->contractorDetail->subcontractor_id !== $subcontractor->id) {
                return response()->json(['message' => 'Bạn không có quyền xem nhật ký này.'], 403);
            }
        }

        return response()->json($log);
    }

    /**
     * Thêm mới nhật ký thi công và cập nhật tiến độ
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'task_detail_id' => 'required|exists:task_details,id',
            'daily_volume' => 'required|numeric|min:0',
            'title' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'weather' => 'nullable|string|max:50',
            'images' => 'nullable|array',
            'images.*' => 'image|mimes:jpeg,png,jpg,gif|max:10240',
            'created_at' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => $validator->errors()->first(), 'errors' => $validator->errors()], 422);
        }

        $taskDetail = TaskDetail::find($request->task_detail_id);
        $dailyVolume = round((float) $request->daily_volume, 2);

        if ($taskDetail && $taskDetail->task && $taskDetail->task->project && $taskDetail->task->project->getRawOriginal('status') === 'Đã hoàn thành') {
            return response()->json(['message' => 'Dự án đã hoàn thành, không thể thêm nhật ký thi công mới.'], 400);
        }

        if ($taskDetail && $taskDetail->task && $taskDetail->task->status === 'DONE') {
            return response()->json(['message' => 'Hạng mục này đã hoàn thành, dữ liệu thi công đã bị khóa.'], 400);
        }

        if ($this->isCancelledTaskDetail($taskDetail)) {
            return response()->json(['message' => 'Công việc này đã hủy, không thể thêm nhật ký thi công mới.'], 400);
        }

        $user = $request->user();

        // 1. Phân quyền: Chỉ cho phép nhà thầu phụ được giao công việc này nhập nhật ký
        if ($user->role && $user->role->name === 'Nhà thầu phụ') {
            $subcontractor = $user->subcontractor;
            if (! $subcontractor || ! $taskDetail->contractorDetail || $taskDetail->contractorDetail->subcontractor_id !== $subcontractor->id) {
                return response()->json(['message' => 'Bạn không có quyền thực hiện nhật ký cho công việc này.'], 403);
            }
        }

        // 2. Chặn nếu công việc đã được gửi nghiệm thu hoặc duyệt nghiệm thu
        if (in_array($taskDetail->acceptance_status, ['PENDING', 'APPROVED'])) {
            return response()->json(['message' => 'Công việc này đã gửi yêu cầu nghiệm thu hoặc đã hoàn thành, không thể thêm nhật ký mới.'], 400);
        }

        // 3. Quy tắc thời gian cập nhật: Chỉ cho phép nhập trong ngày
        $logDate = $request->input('created_at')
            ? Carbon::parse($request->input('created_at'), 'Asia/Ho_Chi_Minh')
            : Carbon::now('Asia/Ho_Chi_Minh');
        if (! $logDate->isToday()) {
            return response()->json(['message' => 'Nhật ký thi công chỉ được phép nhập trong ngày hôm nay.'], 400);
        }

        // 4. Kiểm tra khối lượng không vượt quá khối lượng giao khoán còn lại
        $previousVolume = round((float) ConstructionLog::where('task_detail_id', $taskDetail->id)->sum('daily_volume'), 2);
        $maxAllowed = max(0.0, round((float) $taskDetail->work_volume, 2) - $previousVolume);
        if ($dailyVolume > $maxAllowed) {
            return response()->json([
                'message' => 'Khối lượng nhập vào ('.number_format($dailyVolume, 2).') vượt quá khối lượng còn lại tối đa cho phép là '.number_format($maxAllowed, 2).' (Tổng giao khoán: '.number_format($taskDetail->work_volume, 2).', đã làm lũy kế: '.number_format($previousVolume, 2).').',
            ], 400);
        }

        DB::beginTransaction();
        try {
            $log = new ConstructionLog;
            $log->task_detail_id = $taskDetail->id;
            $log->daily_volume = $dailyVolume;
            $log->title = $request->title;
            $log->description = $request->description;
            $log->weather = $request->weather;
            $log->created_at = $logDate->copy()->setTimezone('UTC');
            $log->save();

            // Xử lý upload hình ảnh
            if ($request->hasFile('images')) {
                foreach ($request->file('images') as $file) {
                    $path = $file->store('construction_logs', 'public');
                    $imageUrl = $path;

                    ConstructionLogImage::create([
                        'construction_log_id' => $log->id,
                        'image_url' => $imageUrl,
                    ]);
                }
            }

            // Tự động tính toán cộng dồn tiến độ của hạng mục con
            $this->recalculateTaskDetailProgress($taskDetail);

            DB::commit();

            return response()->json([
                'message' => 'Ghi nhật ký thi công thành công',
                'data' => $log->load('images', 'taskDetail'),
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json(['message' => 'Lỗi hệ thống khi ghi nhật ký', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Cập nhật nhật ký thi công
     */
    public function update(Request $request, $id): JsonResponse
    {
        $log = ConstructionLog::find($id);

        if (! $log) {
            return response()->json(['message' => 'Không tìm thấy nhật ký thi công'], 404);
        }

        $taskDetail = $log->taskDetail;

        if ($taskDetail && $taskDetail->task && $taskDetail->task->project && $taskDetail->task->project->getRawOriginal('status') === 'Đã hoàn thành') {
            return response()->json(['message' => 'Dự án đã hoàn thành, không thể chỉnh sửa nhật ký thi công.'], 400);
        }

        if ($taskDetail && $taskDetail->task && $taskDetail->task->status === 'DONE') {
            return response()->json(['message' => 'Hạng mục này đã hoàn thành, dữ liệu thi công đã bị khóa.'], 400);
        }

        if ($this->isCancelledTaskDetail($taskDetail)) {
            return response()->json(['message' => 'Công việc này đã hủy, không thể chỉnh sửa nhật ký thi công.'], 400);
        }

        $user = $request->user();

        // 1. Phân quyền: Nhà thầu phụ phải được giao công việc này
        if ($user->role && $user->role->name === 'Nhà thầu phụ') {
            $subcontractor = $user->subcontractor;
            if (! $subcontractor || ! $taskDetail->contractorDetail || $taskDetail->contractorDetail->subcontractor_id !== $subcontractor->id) {
                return response()->json(['message' => 'Bạn không có quyền chỉnh sửa nhật ký này.'], 403);
            }
        }

        // 2. Chặn nếu công việc đã gửi nghiệm thu hoặc đã duyệt
        if (in_array($taskDetail->acceptance_status, ['PENDING', 'APPROVED'])) {
            return response()->json(['message' => 'Công việc này đã gửi yêu cầu nghiệm thu hoặc đã hoàn thành, không thể chỉnh sửa nhật ký.'], 400);
        }

        // 4. Kiểm tra khối lượng không vượt quá khối lượng giao khoán còn lại (loại trừ khối lượng hiện tại của chính log này)
        $previousVolume = ConstructionLog::where('task_detail_id', $taskDetail->id)
            ->where('id', '!=', $log->id)
            ->sum('daily_volume');
        $maxAllowed = max(0.0, floatval($taskDetail->work_volume) - floatval($previousVolume));
        if (floatval($request->daily_volume) > $maxAllowed) {
            return response()->json([
                'message' => 'Khối lượng nhập vào ('.number_format($request->daily_volume, 2).') vượt quá khối lượng còn lại tối đa cho phép là '.number_format($maxAllowed, 2).' (Tổng giao khoán: '.number_format($taskDetail->work_volume, 2).', lũy kế đã làm ở ngày khác: '.number_format($previousVolume, 2).').',
            ], 400);
        }

        $validator = Validator::make($request->all(), [
            'daily_volume' => 'required|numeric|min:0',
            'title' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'weather' => 'nullable|string|max:50',
            'images' => 'nullable|array',
            'images.*' => 'image|mimes:jpeg,png,jpg,gif|max:10240',
            'remove_image_ids' => 'nullable|array',
            'remove_image_ids.*' => 'integer',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => $validator->errors()->first(), 'errors' => $validator->errors()], 422);
        }

        $dailyVolume = round((float) $request->daily_volume, 2);

        DB::beginTransaction();
        try {
            $log->daily_volume = $dailyVolume;
            $log->title = $request->title;
            $log->description = $request->description;
            $log->weather = $request->weather;
            $log->save();

            // Xóa các ảnh cũ mà người dùng đã bỏ khỏi danh sách chỉnh sửa.
            $removeImageIds = collect($request->input('remove_image_ids', []))
                ->map(fn ($id) => (int) $id)
                ->filter()
                ->unique()
                ->values();

            if ($removeImageIds->isNotEmpty()) {
                $imagesToRemove = $log->images()
                    ->whereIn('id', $removeImageIds)
                    ->get();

                foreach ($imagesToRemove as $image) {
                    $storedPath = $image->getRawOriginal('image_url');
                    if ($storedPath) {
                        Storage::disk('public')->delete(ltrim($storedPath, '/'));
                    }
                    $image->delete();
                }
            }

            // Xử lý upload thêm hình ảnh mới nếu có
            if ($request->hasFile('images')) {
                foreach ($request->file('images') as $file) {
                    $path = $file->store('construction_logs', 'public');
                    $imageUrl = $path;

                    ConstructionLogImage::create([
                        'construction_log_id' => $log->id,
                        'image_url' => $imageUrl,
                    ]);
                }
            }

            // Tự động tính toán lại cộng dồn tiến độ của hạng mục con
            $this->recalculateTaskDetailProgress($taskDetail);

            DB::commit();

            return response()->json([
                'message' => 'Cập nhật nhật ký thi công thành công',
                'data' => $log->load('images', 'taskDetail'),
            ]);

        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json(['message' => 'Lỗi hệ thống khi cập nhật nhật ký', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Xóa nhật ký thi công
     */
    public function destroy(Request $request, $id): JsonResponse
    {
        $log = ConstructionLog::find($id);

        if (! $log) {
            return response()->json(['message' => 'Không tìm thấy nhật ký thi công'], 404);
        }

        $taskDetail = $log->taskDetail;

        if ($taskDetail && $taskDetail->task && $taskDetail->task->project && $taskDetail->task->project->getRawOriginal('status') === 'Đã hoàn thành') {
            return response()->json(['message' => 'Dự án đã hoàn thành, không thể xóa nhật ký thi công.'], 400);
        }

        if ($taskDetail && $taskDetail->task && $taskDetail->task->status === 'DONE') {
            return response()->json(['message' => 'Hạng mục này đã hoàn thành, dữ liệu thi công đã bị khóa.'], 400);
        }

        if ($this->isCancelledTaskDetail($taskDetail)) {
            return response()->json(['message' => 'Công việc này đã hủy, không thể xóa nhật ký thi công.'], 400);
        }

        $user = $request->user();

        // 1. Phân quyền
        if ($user->role && $user->role->name === 'Nhà thầu phụ') {
            $subcontractor = $user->subcontractor;
            if (! $subcontractor || ! $taskDetail->contractorDetail || $taskDetail->contractorDetail->subcontractor_id !== $subcontractor->id) {
                return response()->json(['message' => 'Bạn không có quyền xóa nhật ký này.'], 403);
            }
        }

        // 2. Chặn nếu công việc đã gửi nghiệm thu hoặc đã duyệt
        if (in_array($taskDetail->acceptance_status, ['PENDING', 'APPROVED'])) {
            return response()->json(['message' => 'Công việc này đã gửi yêu cầu nghiệm thu hoặc đã hoàn thành, không thể xóa nhật ký.'], 400);
        }

        DB::beginTransaction();
        try {
            $log->delete(); // Sẽ tự động cascade xóa images trên DB

            // Tính toán lại tiến độ sau khi xóa log
            $this->recalculateTaskDetailProgress($taskDetail);

            DB::commit();

            return response()->json(['message' => 'Xóa nhật ký thi công thành công']);

        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json(['message' => 'Lỗi hệ thống khi xóa nhật ký', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Hàm phụ trợ tính toán cộng dồn khối lượng và phần trăm tiến độ hoàn thành
     */
    protected function recalculateTaskDetailProgress(TaskDetail $taskDetail): void
    {
        // Tính tổng khối lượng lũy kế đã làm
        $totalVolume = round((float) ConstructionLog::where('task_detail_id', $taskDetail->id)->sum('daily_volume'), 2);

        // Tính tỷ lệ phần trăm tiến độ hoàn thành dựa trên work_volume (không vượt quá 100%)
        if (floatval($taskDetail->work_volume) > 0) {
            $progressPercent = min(100, (int) round(($totalVolume / floatval($taskDetail->work_volume)) * 100));
        } else {
            $progressPercent = 0;
        }

        $taskDetail->progress_percent = $progressPercent;

        // Cập nhật trạng thái tự động cho công việc con
        if ($progressPercent >= 100) {
            $taskDetail->status = 'DONE';
        } elseif ($progressPercent > 0) {
            $taskDetail->status = 'DOING';
        } else {
            $taskDetail->status = 'TODO';
        }

        $taskDetail->save();

        // Kích hoạt tính toán lại tiến độ cho hạng mục lớn (Parent Task)
        ProjectTask::recalculateProgress($taskDetail->project_task_id);
    }

    protected function isCancelledTaskDetail(?TaskDetail $taskDetail): bool
    {
        return $taskDetail && in_array($taskDetail->status, ['CANCELLED', 'Đã hủy'], true);
    }
}
