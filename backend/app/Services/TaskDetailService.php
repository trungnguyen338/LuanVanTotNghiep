<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\ProjectTask;
use App\Models\SubContract;
use App\Models\TaskDetail;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class TaskDetailService
{
    /**
     * Thêm mới công việc cụ thể (giao khoán nhà thầu phụ)
     */
    public function store(int $taskId, array $data): TaskDetail
    {
        $data = array_merge($data, [
            'progress_percent' => 0,
            'status' => 'TODO',
            'acceptance_status' => 'NONE',
        ]);

        $requestedValue = $this->calculateCommittedValue($data);

        $this->ensureParentTaskValueLimit($taskId, $requestedValue);

        // Kiểm tra xem nhà thầu phụ đã được giao công việc khác chưa hoàn thành hay không
        $contractorDetail = DB::table('detail_contract_contractor')
            ->where('id', $data['contractor_detail_id'])
            ->first();

        if ($contractorDetail) {
            // Kiểm tra hạn mức giao việc thầu phụ
            $subContract = SubContract::find($contractorDetail->sub_contract_id);
            if ($subContract) {
                if ($subContract->status === 'TERMINATED') {
                    throw new \InvalidArgumentException('Hợp đồng thầu phụ đã chấm dứt, không thể giao thêm công việc mới cho nhà thầu phụ này.');
                }

                $limit = floatval($subContract->total_value) + floatval($subContract->addendums()->where('status', 'Có hiệu lực')->sum('value_adjustment'));

                $existingSum = TaskDetail::whereIn('contractor_detail_id', function ($query) use ($subContract) {
                    $query->select('id')->from('detail_contract_contractor')->where('sub_contract_id', $subContract->id);
                })->get()->sum(function ($detail) {
                    return floatval($detail->committed_value);
                });

                if ($existingSum + $requestedValue > $limit) {
                    throw new \InvalidArgumentException('Tổng giá trị các công việc ('.number_format($existingSum + $requestedValue).' VNĐ) không được vượt quá hạn mức hợp đồng thầu phụ ('.number_format($limit).' VNĐ).');
                }
            }
        }

        return DB::transaction(function () use ($taskId, $data) {
            $detail = new TaskDetail;
            $detail->project_task_id = $taskId;
            $detail->contractor_detail_id = $data['contractor_detail_id'];
            $detail->detail_name = $data['detail_name'];
            $detail->unit = $data['unit'] ?? null;
            $detail->work_volume = $data['work_volume'];
            $detail->agreed_price = $data['agreed_price'];
            $detail->progress_percent = $data['progress_percent'];
            $detail->status = $data['status'];
            $detail->acceptance_status = $data['acceptance_status'];
            $detail->start_date = $data['start_date'] ?? null;
            $detail->end_date = $data['end_date'] ?? null;
            $detail->save();

            // Tính toán lại tiến độ cho hạng mục cha
            ProjectTask::recalculateProgress($taskId);

            return $detail;
        });
    }

    /**
     * Cập nhật công việc cụ thể / tiến độ giao khoán
     */
    public function update(TaskDetail $detail, array $data, User $user): TaskDetail
    {
        $requestedValue = $this->calculateCommittedValue($data, $detail);

        $this->ensureParentTaskValueLimit($detail->project_task_id, $requestedValue, $detail->id);

        // Kiểm tra hạn mức giao việc thầu phụ
        $contractorDetail = DB::table('detail_contract_contractor')
            ->where('id', $detail->contractor_detail_id)
            ->first();

        if ($contractorDetail) {
            $subContract = SubContract::find($contractorDetail->sub_contract_id);
            if ($subContract) {
                $limit = floatval($subContract->total_value) + floatval($subContract->addendums()->where('status', 'Có hiệu lực')->sum('value_adjustment'));

                $existingSum = TaskDetail::whereIn('contractor_detail_id', function ($query) use ($subContract) {
                    $query->select('id')->from('detail_contract_contractor')->where('sub_contract_id', $subContract->id);
                })
                    ->where('id', '!=', $detail->id)
                    ->get()->sum(function ($d) {
                        return floatval($d->committed_value);
                    });

                if ($existingSum + $requestedValue > $limit) {
                    throw new \InvalidArgumentException('Tổng giá trị các công việc ('.number_format($existingSum + $requestedValue).' VNĐ) không được vượt quá hạn mức hợp đồng thầu phụ ('.number_format($limit).' VNĐ).');
                }
            }
        }

        // Chặn chỉnh sửa nếu đã được nghiệm thu hoàn thành
        if ($detail->acceptance_status === 'APPROVED') {
            throw new \InvalidArgumentException('Công việc này đã được duyệt nghiệm thu hoàn thành, không thể cập nhật.');
        }

        $this->ensureTaskDetailCanBeCancelled($detail, $data);

        // Kiểm tra phân quyền khi thay đổi trạng thái nghiệm thu
        if (isset($data['acceptance_status']) && $data['acceptance_status'] !== $detail->acceptance_status) {
            if (! $user->role || ! in_array($user->role->name, ['Quản trị viên', 'Admin'])) {
                throw new AuthorizationException('Bạn không có quyền phê duyệt nghiệm thu cho công việc này.');
            }
        }

        // Kiểm tra kỹ hơn cho trường hợp REJECTED
        if (isset($data['acceptance_status']) && $data['acceptance_status'] === 'REJECTED' && empty($data['rejection_note'])) {
            throw ValidationException::withMessages([
                'rejection_note' => ['Trường lý do từ chối là bắt buộc khi trạng thái nghiệm thu bị bác bỏ.'],
            ]);
        }

        $oldAcceptanceStatus = $detail->acceptance_status;

        $updatedDetail = DB::transaction(function () use ($detail, $data) {
            $detail->detail_name = $data['detail_name'];
            if (array_key_exists('unit', $data)) {
                $detail->unit = $data['unit'];
            }
            $detail->work_volume = $data['work_volume'];
            $detail->agreed_price = $data['agreed_price'];
            $detail->progress_percent = $data['progress_percent'];
            if (isset($data['status'])) {
                $detail->status = $data['status'];
            }
            $detail->acceptance_status = $data['acceptance_status'];
            $detail->rejection_note = $data['rejection_note'] ?? null;
            $detail->start_date = $data['start_date'] ?? null;
            $detail->end_date = $data['end_date'] ?? null;

            // Khi từ chối nghiệm thu: chuyển trạng thái công việc về "Đang thực hiện"
            // để nhà thầu phụ có thể sửa chữa, cập nhật nhật ký và gửi lại nghiệm thu
            if ($data['acceptance_status'] === 'REJECTED') {
                $detail->status = 'DOING';
            }

            $detail->save();

            // Tính toán lại tiến độ cho hạng mục cha
            ProjectTask::recalculateProgress($detail->project_task_id);

            return $detail;
        });

        // Thêm thông báo cho các Admin/Quản trị viên khi công việc được nghiệm thu hoàn thành
        if (isset($data['acceptance_status']) && $data['acceptance_status'] === 'APPROVED' && $oldAcceptanceStatus !== 'APPROVED') {
            try {
                $admins = User::whereHas('role', function ($q) {
                    $q->whereIn('name', ['Quản trị viên', 'Admin']);
                })->get();

                $project = $updatedDetail->task?->project;
                $projectName = $project ? $project->name : 'N/A';

                foreach ($admins as $admin) {
                    Notification::create([
                        'user_id' => $admin->id,
                        'title' => 'Công việc đã được nghiệm thu',
                        'content' => "Công việc \"{$updatedDetail->detail_name}\" thuộc hạng mục \"{$updatedDetail->task->task_name}\" của dự án \"{$projectName}\" đã được phê duyệt nghiệm thu hoàn thành. Bạn có thể tiến hành thanh toán.",
                        'type' => 'ACCEPTANCE_APPROVED',
                        'related_id' => $updatedDetail->id,
                        'is_read' => false,
                    ]);

                    if ($updatedDetail->remaining_amount > 0) {
                        Notification::create([
                            'user_id' => $admin->id,
                            'title' => 'Nhắc nhở thanh toán',
                            'content' => "Công việc \"{$updatedDetail->detail_name}\" thuộc hạng mục \"{$updatedDetail->task->task_name}\" của dự án \"{$projectName}\" đã nghiệm thu nhưng chưa được thanh toán hoàn tất (Còn lại: ".number_format($updatedDetail->remaining_amount).' VNĐ). Vui lòng lập phiếu chi để thanh toán.',
                            'type' => 'PAYMENT_REMINDER',
                            'related_id' => $updatedDetail->id,
                            'is_read' => false,
                        ]);
                    }
                }
            } catch (\Exception $e) {
                Log::error('Lỗi khi tạo thông báo thanh toán nghiệm thu: '.$e->getMessage());
            }
        }

        if (isset($data['acceptance_status']) && in_array($data['acceptance_status'], ['APPROVED', 'REJECTED'], true) && $oldAcceptanceStatus !== $data['acceptance_status']) {
            try {
                $project = $updatedDetail->task?->project;
                if ($project) {
                    $title = $data['acceptance_status'] === 'APPROVED'
                        ? 'Công việc đã được nghiệm thu'
                        : 'Công việc cần chỉnh sửa';

                    $content = $data['acceptance_status'] === 'APPROVED'
                        ? 'Công việc "'.$updatedDetail->detail_name.'" thuộc hạng mục "'.$updatedDetail->task->task_name.'" của dự án "'.$project->name.'" đã được duyệt nghiệm thu hoàn thành.'
                        : 'Công việc "'.$updatedDetail->detail_name.'" thuộc hạng mục "'.$updatedDetail->task->task_name.'" của dự án "'.$project->name.'" đã bị từ chối nghiệm thu. Vui lòng kiểm tra nội dung cập nhật trước khi gửi lại.';

                    app(\App\Services\ProjectCustomerNotificationService::class)->notify(
                        $project,
                        $title,
                        $content,
                        $data['acceptance_status'] === 'APPROVED' ? 'TASK_DETAIL_APPROVED' : 'TASK_DETAIL_REJECTED',
                        $updatedDetail->id
                    );
                }
            } catch (\Exception $e) {
                Log::warning('Lỗi khi tạo thông báo khách hàng cho nghiệm thu: '.$e->getMessage());
            }
        }

        return $updatedDetail;
    }

    protected function ensureParentTaskValueLimit(int $taskId, float $requestedValue, ?int $detailId = null): void
    {
        $task = ProjectTask::find($taskId);
        if (! $task) {
            return;
        }

        $taskValue = $task->getEffectiveTaskValue();
        $existingSum = TaskDetail::where('project_task_id', $taskId)
            ->when($detailId, function ($query) use ($detailId) {
                $query->where('id', '!=', $detailId);
            })
            ->get()
            ->sum('committed_value');

        $totalValue = floatval($existingSum) + floatval($requestedValue);

        if ($totalValue > $taskValue) {
            throw new \InvalidArgumentException('Tổng giá trị các công việc con ('.number_format($totalValue).' VNĐ) không được vượt quá giá trị hạng mục ('.number_format($taskValue).' VNĐ).');
        }
    }

    protected function isCancelledStatus($status): bool
    {
        return in_array($status, ['CANCELLED', 'Đã hủy'], true);
    }

    protected function ensureTaskDetailCanBeCancelled(TaskDetail $detail, array $data): void
    {
        $targetStatus = $data['status'] ?? $detail->status;
        if (! $this->isCancelledStatus($targetStatus)) {
            return;
        }

        $progress = floatval($data['progress_percent'] ?? $detail->progress_percent ?? 0);
        if ($progress >= 100) {
            throw new \InvalidArgumentException('Công việc đã đạt 100% tiến độ, không thể chuyển sang trạng thái Đã hủy.');
        }

        $workVolume = floatval($data['work_volume'] ?? $detail->work_volume ?? 0);
        $accumulatedVolume = floatval($detail->logs()->sum('daily_volume'));
        if ($workVolume > 0 && $accumulatedVolume >= $workVolume) {
            throw new \InvalidArgumentException('Công việc đã ghi nhận đủ 100% khối lượng thi công, không thể chuyển sang trạng thái Đã hủy.');
        }
    }

    protected function calculateCommittedValue(array $data, ?TaskDetail $existingDetail = null): float
    {
        $workVolume = floatval($data['work_volume'] ?? $existingDetail?->work_volume ?? 0);
        $agreedPrice = floatval($data['agreed_price'] ?? $existingDetail?->agreed_price ?? 0);
        $baseValue = $workVolume * $agreedPrice;

        $status = $data['status'] ?? $existingDetail?->status ?? null;
        if (! $this->isCancelledStatus($status)) {
            return $baseValue;
        }

        $progress = floatval($data['progress_percent'] ?? $existingDetail?->progress_percent ?? 0);
        if ($progress <= 0) {
            return 0.0;
        }

        return floatval($baseValue * min(100, $progress) / 100);
    }

    /**
     * Xóa công việc giao khoán
     */
    public function destroy(TaskDetail $detail): void
    {
        // Chặn xóa nếu đã được duyệt nghiệm thu
        if ($detail->acceptance_status === 'APPROVED') {
            throw new \InvalidArgumentException('Công việc này đã được nghiệm thu hoàn thành, không thể xóa.');
        }

        DB::transaction(function () use ($detail) {
            $taskId = $detail->project_task_id;

            $detail->delete();

            // Tính toán lại tiến độ cho hạng mục cha
            ProjectTask::recalculateProgress($taskId);
        });
    }

    /**
     * Gửi yêu cầu nghiệm thu khối lượng đến ban quản lý dự án
     */
    public function requestAcceptance(TaskDetail $detail, User $user): TaskDetail
    {
        // 1. Phân quyền: Nhà thầu phụ phải được giao công việc này
        if ($user->role && $user->role->name === 'Nhà thầu phụ') {
            $subcontractor = $user->subcontractor;
            if (! $subcontractor || ! $detail->contractorDetail || $detail->contractorDetail->subcontractor_id !== $subcontractor->id) {
                throw new AuthorizationException('Bạn không có quyền gửi yêu cầu nghiệm thu cho công việc này.');
            }
        }

        // 2. Ràng buộc: Chỉ được phép gửi khi tiến độ đạt 100%
        if ($detail->progress_percent < 100) {
            throw new \InvalidArgumentException('Hệ thống đã khóa tính năng này. Bạn chỉ có thể gửi yêu cầu nghiệm thu khi tiến độ đạt 100%.');
        }

        // 3. Đảm bảo trạng thái hiện tại hợp lệ để gửi nghiệm thu
        if ($detail->acceptance_status === 'APPROVED') {
            throw new \InvalidArgumentException('Công việc này đã được duyệt nghiệm thu hoàn thành.');
        }
        if ($detail->acceptance_status === 'PENDING') {
            throw new \InvalidArgumentException('Yêu cầu nghiệm thu đang chờ duyệt.');
        }

        $detail->acceptance_status = 'PENDING';
        $detail->save();

        // Thêm thông báo cho các Admin/Quản trị viên
        try {
            $admins = User::whereHas('role', function ($q) {
                $q->whereIn('name', ['Quản trị viên', 'Admin']);
            })->get();

            $project = $detail->task?->project;
            $projectName = $project ? $project->name : 'N/A';
            $subcontractorName = $user->full_name ?: 'Nhà thầu phụ';

            foreach ($admins as $admin) {
                Notification::create([
                    'user_id' => $admin->id,
                    'title' => 'Yêu cầu nghiệm thu mới',
                    'content' => "Nhà thầu phụ {$subcontractorName} đã gửi yêu cầu nghiệm thu cho công việc \"{$detail->detail_name}\" thuộc hạng mục \"{$detail->task->task_name}\" của dự án \"{$projectName}\".",
                    'type' => 'ACCEPTANCE_REQUEST',
                    'related_id' => $detail->id,
                    'is_read' => false,
                ]);
            }
        } catch (\Exception $e) {
            Log::error('Lỗi khi tạo thông báo nghiệm thu: '.$e->getMessage());
        }

        return $detail;
    }
}
