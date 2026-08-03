<?php

namespace App\Http\Controllers;

use App\Models\ClientContract;
use App\Models\PaymentTaskDetail;
use App\Models\Project;
use App\Models\ProjectPayment;
use App\Models\SubContract;
use App\Models\TaskDetail;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class ProjectPaymentController extends Controller
{
    private function isTerminatedSubContract(SubContract $subContract): bool
    {
        return in_array($subContract->status, ['TERMINATED', 'CANCELLED', 'Bị hủy'], true)
            || in_array($subContract->getRawOriginal('status'), ['TERMINATED', 'CANCELLED', 'Bị hủy'], true);
    }

    /**
     * Lấy các thống kê tổng quan tài chính
     */
    public function getStats(): JsonResponse
    {
        // 1. Tổng dư quỹ = Tổng thực thu - Tổng thực chi
        $totalRevenue = floatval(ProjectPayment::where('payment_type', 'THU')->where('status', 'Đã giải ngân')->sum('amount'));
        $totalCost = floatval(ProjectPayment::where('payment_type', 'CHI')->where('status', 'Đã giải ngân')->sum('amount'));
        $fundBalance = $totalRevenue - $totalCost;

        // 2. Tổng Phải Thu = Tổng số tiền còn phải thu của tất cả hợp đồng khách hàng đang hoạt động
        $contracts = ClientContract::whereIn('status', ['ACTIVE', 'COMPLETED', 'Có hiệu lực', 'Đã thanh lý'])->get();
        $totalReceivable = floatval($contracts->sum('remaining_amount'));

        // 3. Tổng Phải Trả = Tổng số tiền còn phải trả của tất cả hợp đồng thầu phụ đang hoạt động
        $subContracts = SubContract::whereIn('status', ['ACTIVE', 'COMPLETED', 'Có hiệu lực', 'Đã thanh lý'])->get();
        $totalPayable = floatval($subContracts->sum('remaining_amount'));

        return response()->json([
            'fund_balance' => $fundBalance,
            'total_receivable' => $totalReceivable,
            'total_payable' => $totalPayable,
        ]);
    }

    /**
     * Lấy danh sách phiếu thanh toán (Thu/Chi)
     */
    public function index(Request $request): JsonResponse
    {
        $query = ProjectPayment::with([
            'clientContract.project.customer',
            'subContract.project',
            'subContract.subcontractors',
        ]);

        if ($request->has('payment_type')) {
            $paymentType = $request->input('payment_type');
            // Chuyển đổi nếu frontend gửi dạng REVENUE/COST
            if ($paymentType === 'REVENUE') {
                $paymentType = 'THU';
            }
            if ($paymentType === 'COST') {
                $paymentType = 'CHI';
            }
            $query->where('payment_type', $paymentType);
        }

        if ($request->has('status')) {
            $status = $request->input('status');
            if ($status === 'PENDING') {
                $status = 'Chờ duyệt';
            }
            if ($status === 'COMPLETED') {
                $status = 'Đã giải ngân';
            }
            $query->where('status', $status);
        }

        if ($request->has('client_contract_id')) {
            $query->where('client_contract_id', $request->input('client_contract_id'));
        }

        if ($request->has('sub_contract_id')) {
            $query->where('sub_contract_id', $request->input('sub_contract_id'));
        }

        if ($request->has('project_id')) {
            $projectId = $request->input('project_id');
            $query->where(function ($q) use ($projectId) {
                $q->whereHas('clientContract', function ($sub) use ($projectId) {
                    $sub->where('project_id', $projectId);
                })->orWhereHas('subContract', function ($sub) use ($projectId) {
                    $sub->where('project_id', $projectId);
                });
            });
        }

        $payments = $query->orderBy('id', 'desc')->get();

        return response()->json($payments);
    }

    /**
     * Xem chi tiết phiếu thanh toán
     */
    public function show($id): JsonResponse
    {
        $payment = ProjectPayment::with([
            'clientContract.project.customer',
            'subContract.project',
            'subContract.subcontractors',
            'paymentTaskDetails.taskDetail.task',
            'paymentTaskDetails.taskDetail.contractorDetail.subcontractor',
        ])->find($id);

        if (! $payment) {
            return response()->json(['message' => 'Không tìm thấy phiếu thanh toán'], 404);
        }

        return response()->json($payment);
    }

    /**
     * Khởi tạo phiếu thanh toán mới
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'payment_type' => 'required|in:REVENUE,COST,THU,CHI',
            'client_contract_id' => 'required_if:payment_type,REVENUE,THU|exists:client_contracts,id',
            'sub_contract_id' => 'required_if:payment_type,COST,CHI|nullable|exists:sub_contracts,id',
            'title' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0.01',
            'payment_date' => 'nullable|date',
            'status' => 'nullable|in:PENDING,COMPLETED,Chờ duyệt,Đã giải ngân',
            'task_allocations' => 'nullable|array',
            'task_allocations.*.task_detail_id' => 'required_with:task_allocations|exists:task_details,id',
            'task_allocations.*.allocated_amount' => 'required_with:task_allocations|numeric|min:0.01',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => $validator->errors()->first(), 'errors' => $validator->errors()], 422);
        }

        $paymentType = $request->payment_type;
        if ($paymentType === 'REVENUE') {
            $paymentType = 'THU';
        }
        if ($paymentType === 'COST') {
            $paymentType = 'CHI';
        }

        $projectId = null;
        if ($paymentType === 'THU' && $request->client_contract_id) {
            $contract = ClientContract::find($request->client_contract_id);
            if ($contract) {
                if ($contract->status === 'TERMINATED') {
                    return response()->json(['message' => 'Hợp đồng khách hàng đã chấm dứt, không thể tạo phiếu thu mới.'], 400);
                }
                $projectId = $contract->project_id;
            }
        } elseif ($paymentType === 'CHI' && $request->sub_contract_id) {
            $subContract = SubContract::find($request->sub_contract_id);
            if ($subContract) {
                if ($this->isTerminatedSubContract($subContract)) {
                    return response()->json(['message' => 'Hợp đồng thầu phụ đã bị hủy, không thể tạo phiếu chi mới.'], 400);
                }
                $projectId = $subContract->project_id;
            }
        }

        if ($projectId) {
            $project = Project::find($projectId);
            if ($project && $project->getRawOriginal('status') === 'Đã hoàn thành') {
                return response()->json(['message' => 'Dự án đã hoàn thành, không thể thêm phiếu thu/chi mới.'], 400);
            }
        }

        $status = $request->status;
        if (empty($status)) {
            // Mặc định cho phiếu thu (REVENUE) là COMPLETED (Đã giải ngân)
            $status = ($paymentType === 'THU') ? 'COMPLETED' : 'PENDING';
        }

        $statusMapped = $status;
        if ($statusMapped === 'PENDING') {
            $statusMapped = 'Chờ duyệt';
        }
        if ($statusMapped === 'COMPLETED') {
            $statusMapped = 'Đã giải ngân';
        }

        $amount = floatval($request->amount);

        // Kiểm tra ràng buộc doanh thu thực thu không vượt quá số tiền còn lại của hợp đồng
        if ($paymentType === 'THU' && $statusMapped === 'Đã giải ngân') {
            $contract = ClientContract::find($request->client_contract_id);
            if ($contract) {
                $otherPaymentsSum = ProjectPayment::where('client_contract_id', $contract->id)
                    ->where('payment_type', 'THU')
                    ->where('status', 'Đã giải ngân')
                    ->sum('amount');

                $remaining = $contract->actual_value - $otherPaymentsSum;
                if ($amount > $remaining + 10) {
                    return response()->json([
                        'message' => 'Số tiền thực thu ('.number_format($amount).' VNĐ) không được vượt quá số tiền còn phải thu của hợp đồng ('.number_format($remaining).' VNĐ).',
                    ], 400);
                }
            }
        }

        // Validate allocations for subcontractor payments
        if ($paymentType === 'CHI' && ! empty($request->sub_contract_id)) {
            if (! $request->has('task_allocations') || empty($request->task_allocations)) {
                return response()->json([
                    'message' => 'Phiếu chi cho hợp đồng thầu phụ bắt buộc phải phân bổ số tiền cho các công việc.',
                ], 400);
            }

            $allocationsSum = array_sum(array_column($request->task_allocations, 'allocated_amount'));
            if (abs($allocationsSum - $amount) > 10) {
                return response()->json([
                    'message' => 'Tổng số tiền phân bổ cho các công việc ('.number_format($allocationsSum).' VNĐ) phải bằng tổng số tiền của phiếu chi ('.number_format($amount).' VNĐ).',
                ], 400);
            }

            if ($statusMapped === 'Đã giải ngân') {
                $subContract = SubContract::find($request->sub_contract_id);
                if ($subContract) {
                    $otherPaymentsSum = ProjectPayment::where('sub_contract_id', $subContract->id)
                        ->where('payment_type', 'CHI')
                        ->where('status', 'Đã giải ngân')
                        ->sum('amount');

                    $remaining = $subContract->actual_value - $otherPaymentsSum;
                    if ($amount > $remaining + 10) {
                        return response()->json([
                            'message' => 'Số tiền thực chi ('.number_format($amount).' VNĐ) không được vượt quá số tiền còn phải chi trả của hợp đồng thầu phụ ('.number_format($remaining).' VNĐ).',
                        ], 400);
                    }
                }
            }

            foreach ($request->task_allocations as $alloc) {
                $task = TaskDetail::find($alloc['task_detail_id']);
                if ($task) {
                    $otherPaidAmount = floatval(DB::table('payment_task_details')
                        ->join('project_payment', 'payment_task_details.payment_id', '=', 'project_payment.id')
                        ->where('payment_task_details.task_detail_id', $task->id)
                        ->where('project_payment.status', 'Đã giải ngân')
                        ->sum('payment_task_details.allocated_amount'));

                    $taskTotalValue = floatval($task->work_volume) * floatval($task->agreed_price);
                    $taskRemaining = $taskTotalValue - $otherPaidAmount;

                    if ($alloc['allocated_amount'] > $taskRemaining + 10) {
                        return response()->json([
                            'message' => 'Số tiền phân bổ cho công việc "'.$task->detail_name.'" ('.number_format($alloc['allocated_amount']).' VNĐ) vượt quá số tiền còn lại được phép giải ngân ('.number_format($taskRemaining).' VNĐ).',
                        ], 400);
                    }
                }
            }
        }

        DB::beginTransaction();
        try {
            $payment = new ProjectPayment;
            $payment->payment_type = $paymentType;
            $payment->client_contract_id = $request->client_contract_id;
            $payment->sub_contract_id = $request->sub_contract_id;
            $payment->title = $request->title;
            $payment->amount = $amount;
            $payment->payment_date = $request->payment_date ?: now()->toDateString();
            $payment->status = $status;
            $payment->save();

            // Save allocations
            if ($paymentType === 'CHI' && ! empty($request->sub_contract_id) && $request->has('task_allocations')) {
                foreach ($request->task_allocations as $alloc) {
                    PaymentTaskDetail::create([
                        'payment_id' => $payment->id,
                        'task_detail_id' => $alloc['task_detail_id'],
                        'allocated_amount' => floatval($alloc['allocated_amount']),
                    ]);
                }
            }

            DB::commit();

            if ($paymentType === 'THU') {
                $contract = ClientContract::find($payment->client_contract_id);
                if ($contract && $contract->project) {
                    $title = $statusMapped === 'Đã giải ngân'
                        ? 'Thanh toán đã được ghi nhận'
                        : 'Yêu cầu thanh toán mới';

                    $content = $statusMapped === 'Đã giải ngân'
                        ? 'Phiếu thu "'.$payment->title.'" trị giá '.number_format($amount).' VNĐ cho hợp đồng "'.$contract->contract_name.'" vừa được giải ngân.'
                        : 'Hệ thống vừa tạo yêu cầu thanh toán "'.$payment->title.'" trị giá '.number_format($amount).' VNĐ cho hợp đồng "'.$contract->contract_name.'".';

                    app(\App\Services\ProjectCustomerNotificationService::class)->notify(
                        $contract->project,
                        $title,
                        $content,
                        'PROJECT_PAYMENT_CREATED',
                        $payment->id
                    );
                }
            }

            if ($statusMapped === 'Đã giải ngân') {
                if ($paymentType === 'THU') {
                    $contract = ClientContract::find($payment->client_contract_id);
                    $project = $contract?->project;
                    if ($contract && $project) {
                        $contract->syncCompletionStatus();
                        $project->checkAutoCompletion();
                    }
                } elseif ($paymentType === 'CHI') {
                    $subContract = SubContract::find($payment->sub_contract_id);
                    $project = $subContract?->project;
                    if ($subContract && $project) {
                        $subContract->syncCompletionStatus();
                        $project->checkAutoCompletion();
                    }
                }
            }

            return response()->json([
                'message' => 'Tạo phiếu thanh toán thành công',
                'data' => $payment->load(['clientContract', 'subContract', 'paymentTaskDetails.taskDetail.task']),
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json(['message' => 'Lỗi hệ thống khi tạo phiếu thanh toán', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Cập nhật phiếu thanh toán
     */
    public function update(Request $request, $id): JsonResponse
    {
        $payment = ProjectPayment::find($id);

        if (! $payment) {
            return response()->json(['message' => 'Không tìm thấy phiếu thanh toán'], 404);
        }

        $projectId = null;
        if ($payment->clientContract) {
            $projectId = $payment->clientContract->project_id;
        } elseif ($payment->subContract) {
            $projectId = $payment->subContract->project_id;
        }

        $originalStatusMapped = $payment->getRawOriginal('status');
        $originalAmount = floatval($payment->getRawOriginal('amount'));

        if ($projectId) {
            $project = Project::find($projectId);
            if ($project && $project->getRawOriginal('status') === 'Đã hoàn thành') {
                return response()->json(['message' => 'Dự án đã hoàn thành, không thể cập nhật phiếu thanh toán.'], 400);
            }
        }

        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0.01',
            'payment_date' => 'nullable|date',
            'status' => 'required|in:PENDING,COMPLETED,Chờ duyệt,Đã giải ngân',
            'task_allocations' => 'nullable|array',
            'task_allocations.*.task_detail_id' => 'required_with:task_allocations|exists:task_details,id',
            'task_allocations.*.allocated_amount' => 'required_with:task_allocations|numeric|min:0.01',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => $validator->errors()->first(), 'errors' => $validator->errors()], 422);
        }

        $status = $request->status;
        $statusMapped = $status;
        if ($statusMapped === 'PENDING') {
            $statusMapped = 'Chờ duyệt';
        }
        if ($statusMapped === 'COMPLETED') {
            $statusMapped = 'Đã giải ngân';
        }

        $amount = floatval($request->amount);

        // Lấy payment_type từ model (chú ý: accessor trả về REVENUE/COST)
        $rawPaymentType = $payment->getRawOriginal('payment_type'); // 'THU' hoặc 'CHI'

        // Kiểm tra ràng buộc khi đổi sang Đã giải ngân hoặc sửa số tiền
        if ($rawPaymentType === 'THU' && $statusMapped === 'Đã giải ngân') {
            $contract = ClientContract::find($payment->client_contract_id);
            if ($contract) {
                if ($contract->status === 'TERMINATED') {
                    return response()->json(['message' => 'Hợp đồng khách hàng đã chấm dứt, không thể xác nhận thu tiền.'], 400);
                }
                $otherPaymentsSum = ProjectPayment::where('client_contract_id', $contract->id)
                    ->where('payment_type', 'THU')
                    ->where('status', 'Đã giải ngân')
                    ->where('id', '!=', $payment->id)
                    ->sum('amount');

                $remaining = $contract->actual_value - $otherPaymentsSum;
                if ($amount > $remaining + 10) {
                    return response()->json([
                        'message' => 'Số tiền thực thu ('.number_format($amount).' VNĐ) không được vượt quá số tiền còn phải thu của hợp đồng ('.number_format($remaining).' VNĐ).',
                    ], 400);
                }
            }
        }

        // Validate allocations for subcontractor payments
        if ($rawPaymentType === 'CHI' && ! empty($payment->sub_contract_id)) {
            if (! $request->has('task_allocations') || empty($request->task_allocations)) {
                return response()->json([
                    'message' => 'Phiếu chi cho hợp đồng thầu phụ bắt buộc phải phân bổ số tiền cho các công việc.',
                ], 400);
            }

            $allocationsSum = array_sum(array_column($request->task_allocations, 'allocated_amount'));
            if (abs($allocationsSum - $amount) > 10) {
                return response()->json([
                    'message' => 'Tổng số tiền phân bổ cho các công việc ('.number_format($allocationsSum).' VNĐ) phải bằng tổng số tiền của phiếu chi ('.number_format($amount).' VNĐ).',
                ], 400);
            }

            // Check overall sub contract limit
            if ($statusMapped === 'Đã giải ngân') {
                $subContract = SubContract::find($payment->sub_contract_id);
                if ($subContract) {
                    $otherPaymentsSum = ProjectPayment::where('sub_contract_id', $subContract->id)
                        ->where('payment_type', 'CHI')
                        ->where('status', 'Đã giải ngân')
                        ->where('id', '!=', $payment->id)
                        ->sum('amount');

                    $remaining = $subContract->actual_value - $otherPaymentsSum;
                    if ($amount > $remaining + 10) {
                        return response()->json([
                            'message' => 'Số tiền thực chi ('.number_format($amount).' VNĐ) không được vượt quá số tiền còn phải chi trả của hợp đồng thầu phụ ('.number_format($remaining).' VNĐ).',
                        ], 400);
                    }
                }
            }

            foreach ($request->task_allocations as $alloc) {
                $task = TaskDetail::find($alloc['task_detail_id']);
                if ($task) {
                    $otherPaidAmount = floatval(DB::table('payment_task_details')
                        ->join('project_payment', 'payment_task_details.payment_id', '=', 'project_payment.id')
                        ->where('payment_task_details.task_detail_id', $task->id)
                        ->where('project_payment.status', 'Đã giải ngân')
                        ->where('project_payment.id', '!=', $payment->id) // exclude current payment
                        ->sum('payment_task_details.allocated_amount'));

                    $taskTotalValue = floatval($task->work_volume) * floatval($task->agreed_price);
                    $taskRemaining = $taskTotalValue - $otherPaidAmount;

                    if ($alloc['allocated_amount'] > $taskRemaining + 10) {
                        return response()->json([
                            'message' => 'Số tiền phân bổ cho công việc "'.$task->detail_name.'" ('.number_format($alloc['allocated_amount']).' VNĐ) vượt quá số tiền còn lại được phép giải ngân ('.number_format($taskRemaining).' VNĐ).',
                        ], 400);
                    }
                }
            }
        }

        DB::beginTransaction();
        try {
            $payment->title = $request->title;
            $payment->amount = $amount;
            $payment->payment_date = $request->payment_date ?: $payment->payment_date;
            $payment->status = $status;
            $payment->save();

            // Update allocations
            if ($rawPaymentType === 'CHI' && ! empty($payment->sub_contract_id)) {
                // Delete old allocations first
                PaymentTaskDetail::where('payment_id', $payment->id)->delete();

                if ($request->has('task_allocations') && ! empty($request->task_allocations)) {
                    foreach ($request->task_allocations as $alloc) {
                        PaymentTaskDetail::create([
                            'payment_id' => $payment->id,
                            'task_detail_id' => $alloc['task_detail_id'],
                            'allocated_amount' => floatval($alloc['allocated_amount']),
                        ]);
                    }
                }
            }

            DB::commit();

            if ($rawPaymentType === 'THU' && ($statusMapped !== $originalStatusMapped || abs($amount - $originalAmount) > 0.01)) {
                $contract = ClientContract::find($payment->client_contract_id);
                if ($contract && $contract->project) {
                    $title = $statusMapped === 'Đã giải ngân'
                        ? 'Thanh toán đã được ghi nhận'
                        : 'Phiếu thu đã được cập nhật';

                    $content = $statusMapped === 'Đã giải ngân'
                        ? 'Phiếu thu "'.$payment->title.'" trị giá '.number_format($amount).' VNĐ cho hợp đồng "'.$contract->contract_name.'" đã được giải ngân.'
                        : 'Phiếu thu "'.$payment->title.'" cho hợp đồng "'.$contract->contract_name.'" vừa được cập nhật thông tin hoặc trạng thái trên hệ thống.';

                    app(\App\Services\ProjectCustomerNotificationService::class)->notify(
                        $contract->project,
                        $title,
                        $content,
                        'PROJECT_PAYMENT_UPDATED',
                        $payment->id
                    );
                }
            }

            if ($statusMapped === 'Đã giải ngân') {
                if ($rawPaymentType === 'THU') {
                    $contract = ClientContract::find($payment->client_contract_id);
                    $project = $contract?->project;
                    if ($contract && $project) {
                        $contract->syncCompletionStatus();
                        $project->checkAutoCompletion();
                    }
                } elseif ($rawPaymentType === 'CHI') {
                    $subContract = SubContract::find($payment->sub_contract_id);
                    $project = $subContract?->project;
                    if ($subContract && $project) {
                        $subContract->syncCompletionStatus();
                        $project->checkAutoCompletion();
                    }
                }
            }

            return response()->json([
                'message' => 'Cập nhật phiếu thanh toán thành công',
                'data' => $payment->load(['clientContract', 'subContract', 'paymentTaskDetails.taskDetail.task']),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json(['message' => 'Lỗi hệ thống khi cập nhật phiếu thanh toán', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Xóa phiếu thanh toán
     */
    public function destroy($id): JsonResponse
    {
        $payment = ProjectPayment::find($id);

        if (! $payment) {
            return response()->json(['message' => 'Không tìm thấy phiếu thanh toán'], 404);
        }

        $projectId = null;
        if ($payment->clientContract) {
            $projectId = $payment->clientContract->project_id;
        } elseif ($payment->subContract) {
            $projectId = $payment->subContract->project_id;
        }

        if ($projectId) {
            $project = Project::find($projectId);
            if ($project && $project->getRawOriginal('status') === 'Đã hoàn thành') {
                return response()->json(['message' => 'Dự án đã hoàn thành, không thể xóa phiếu thanh toán.'], 400);
            }
        }

        if ($payment->status === 'COMPLETED') {
            return response()->json(['message' => 'Không thể xóa phiếu thanh toán đã giải ngân.'], 400);
        }

        DB::beginTransaction();
        try {
            PaymentTaskDetail::where('payment_id', $payment->id)->delete();
            $payment->delete();
            DB::commit();

            return response()->json(['message' => 'Xóa phiếu thanh toán thành công']);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json(['message' => 'Lỗi hệ thống khi xóa phiếu thanh toán', 'error' => $e->getMessage()], 500);
        }
    }
}
