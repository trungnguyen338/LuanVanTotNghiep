<?php

namespace App\Http\Controllers;

use App\Models\ClientContract;
use App\Models\DocumentType;
use App\Models\ProjectDocument;
use App\Models\ProjectPayment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class ClientContractController extends Controller
{
    /**
     * Lấy danh sách hợp đồng khách hàng
     */
    public function index(Request $request): JsonResponse
    {
        $query = ClientContract::with(['project', 'project.customer'])
            ->withSum(['addendums as addendums_sum' => function ($q) {
                $q->where('status', 'Có hiệu lực');
            }], 'value_adjustment');

        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('contract_name', 'LIKE', "%{$search}%")
                    ->orWhere('contract_code', 'LIKE', "%{$search}%");
            });
        }

        if ($request->has('project_id')) {
            $query->where('project_id', $request->input('project_id'));
        }

        if ($request->has('status')) {
            $query->where('status', $request->input('status'));
        }

        $contracts = $query->orderBy('id', 'desc')->get();

        $formattedContracts = $contracts->map(function ($contract) {
            $contract->total_value = (float) $contract->contract_value + (float) ($contract->addendums_sum ?? 0);

            return $contract;
        });

        return response()->json($formattedContracts);
    }

    /**
     * Lấy chi tiết hợp đồng khách hàng
     */
    public function show($id): JsonResponse
    {
        $contract = ClientContract::with(['project', 'items', 'addendums', 'documents', 'project.customer'])
            ->withSum(['addendums as addendums_sum' => function ($q) {
                $q->where('status', 'Có hiệu lực');
            }], 'value_adjustment')
            ->find($id);

        if (! $contract) {
            return response()->json(['message' => 'Không tìm thấy hợp đồng khách hàng'], 404);
        }

        $contract->total_value = (float) $contract->contract_value + (float) ($contract->addendums_sum ?? 0);

        return response()->json($contract);
    }

    /**
     * Lập hợp đồng mới
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'project_id' => 'required|exists:projects,id',
            'contract_name' => 'required|string|max:255',
            'contract_value' => 'required|numeric|min:0',
            'signed_date' => 'nullable|date',
            'document_file' => 'nullable|file|allowed_extensions:pdf,doc,docx,xls,xlsx,jpg,jpeg,png,zip|max:20480',
            'document_files' => 'nullable|array',
            'document_files.*' => 'required|file|allowed_extensions:pdf,doc,docx,xls,xlsx,jpg,jpeg,png,zip|max:20480',
            'file_url' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => $validator->errors()->first(), 'errors' => $validator->errors()], 422);
        }

        $project = \App\Models\Project::find($request->project_id);
        if ($project && $project->getRawOriginal('status') === 'Đã hoàn thành') {
            return response()->json(['message' => 'Dự án đã hoàn thành, không thể thêm hợp đồng mới.'], 400);
        }

        DB::beginTransaction();
        try {
            // Tự động sinh mã hợp đồng (HD-xxxx)
            $lastContract = ClientContract::orderBy('id', 'desc')->first();
            $nextId = $lastContract ? $lastContract->id + 1 : 1;
            $contractCode = 'HD-'.str_pad($nextId, 4, '0', STR_PAD_LEFT);

            $contract = new ClientContract;
            $contract->project_id = $request->project_id;
            $contract->contract_code = $contractCode;
            $contract->contract_name = $request->contract_name;
            $contract->contract_value = $request->contract_value;
            $contract->signed_date = $request->signed_date;
            $contract->status = 'DRAFT'; // Khởi tạo ở trạng thái Bản nháp để thêm hạng mục
            $contract->save();

            // Xử lý loại tài liệu "Hợp đồng khách hàng"
            $docType = DocumentType::firstOrCreate(
                ['type_name' => 'Hợp đồng khách hàng']
            );

            // Xử lý tải lên nhiều file
            if ($request->hasFile('document_files')) {
                foreach ($request->file('document_files') as $file) {
                    $path = $file->store('documents', 'public');
                    $fileUrl = asset('storage/'.$path);

                    $document = new ProjectDocument;
                    $document->project_id = $contract->project_id;
                    $document->document_name = $file->getClientOriginalName();
                    $document->document_type_id = $docType->id;
                    $document->file_url = $fileUrl;
                    $document->status = $contract->document_status;

                    $contract->documents()->save($document);
                }
            }

            // Xử lý tải lên file đơn lẻ (backward compatibility)
            if ($request->hasFile('document_file')) {
                $file = $request->file('document_file');
                $path = $file->store('documents', 'public');
                $fileUrl = asset('storage/'.$path);

                $document = new ProjectDocument;
                $document->project_id = $contract->project_id;
                $document->document_name = $file->getClientOriginalName();
                $document->document_type_id = $docType->id;
                $document->file_url = $fileUrl;
                $document->status = $contract->document_status;

                $contract->documents()->save($document);
            } elseif ($request->filled('file_url')) {
                $document = new ProjectDocument;
                $document->project_id = $contract->project_id;
                $document->document_name = 'Tài liệu hợp đồng '.$contractCode;
                $document->document_type_id = $docType->id;
                $document->file_url = $request->file_url;
                $document->status = $contract->document_status;

                $contract->documents()->save($document);
            }

            DB::commit();

            app(\App\Services\ProjectCustomerNotificationService::class)->notify(
                $contract->project,
                'Hợp đồng khách hàng mới',
                'Hợp đồng "'.$contract->contract_name.'" (mã '.$contract->contract_code.') đã được tạo cho dự án "'.$contract->project?->name.'".',
                'CLIENT_CONTRACT_CREATED',
                $contract->id
            );

            return response()->json([
                'message' => 'Lập hợp đồng thành công',
                'data' => $contract->load(['project', 'documents']),
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json(['message' => 'Lỗi hệ thống khi tạo hợp đồng', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Cập nhật hợp đồng
     */
    public function update(Request $request, $id): JsonResponse
    {
        $contract = ClientContract::find($id);

        if (! $contract) {
            return response()->json(['message' => 'Không tìm thấy hợp đồng'], 404);
        }

        if ($contract->project && $contract->project->getRawOriginal('status') === 'Đã hoàn thành') {
            return response()->json(['message' => 'Dự án đã hoàn thành, không thể chỉnh sửa hợp đồng.'], 400);
        }

        $validator = Validator::make($request->all(), [
            'contract_name' => 'required|string|max:255',
            'contract_value' => 'required|numeric|min:0',
            'signed_date' => 'nullable|date',
            'status' => 'required|in:DRAFT,ACTIVE,COMPLETED,TERMINATED',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => $validator->errors()->first(), 'errors' => $validator->errors()], 422);
        }

        // Ràng buộc: Tổng giá trị các hạng mục đang hoạt động phải bằng giá trị hợp đồng thực tế (bao gồm phụ lục và giảm trừ) khi kích hoạt/hoàn thành
        if ($request->status === 'ACTIVE' || $request->status === 'COMPLETED') {
            $sumActive = $contract->items()->where('status', 'active')->get()->sum('price');
            $expectedValue = floatval($request->contract_value) + floatval($contract->addition_value) - floatval($contract->reduction_value);
            if (abs($sumActive - $expectedValue) > 0.01) {
                return response()->json([
                    'message' => 'Tổng giá trị các hạng mục đang hoạt động ('.number_format($sumActive).' VNĐ) phải bằng đúng giá trị hợp đồng thực tế bao gồm phụ lục ('.number_format($expectedValue).' VNĐ) mới có thể lưu trạng thái Có hiệu lực hoặc Hoàn thành.',
                ], 400);
            }
        }

        // Khóa các thông tin cốt lõi mang tính định danh: không cập nhật project_id và contract_code
        $contract->contract_name = $request->contract_name;
        $contract->contract_value = $request->contract_value;
        $contract->signed_date = $request->signed_date;
        $contract->status = $request->status;
        $contract->save();
        $contract->syncDocumentStatuses();

        app(\App\Services\ProjectCustomerNotificationService::class)->notify(
            $contract->project,
            'Hợp đồng khách hàng đã được cập nhật',
            'Hợp đồng "'.$contract->contract_name.'" (mã '.$contract->contract_code.') vừa được cập nhật trạng thái thành "'.$contract->status.'".',
            'CLIENT_CONTRACT_UPDATED',
            $contract->id
        );

        // Hợp đồng khách hàng bị chấm dứt: tự động tạm dừng dự án, không cho phát sinh hạng mục/công việc mới nữa
        if ($request->status === 'TERMINATED' && $contract->project && $contract->project->getRawOriginal('status') !== 'Đã hoàn thành') {
            $contract->project->status = 'ON_HOLD';
            $contract->project->save();

            app(\App\Services\ProjectCustomerNotificationService::class)->notify(
                $contract->project,
                'Dự án tạm dừng do hợp đồng chấm dứt',
                'Hợp đồng khách hàng "'.$contract->contract_name.'" đã chuyển sang trạng thái '.$contract->status.' nên dự án "'.$contract->project->name.'" hiện được tạm dừng.',
                'PROJECT_ON_HOLD',
                $contract->project->id
            );
        }

        return response()->json([
            'message' => 'Cập nhật hợp đồng thành công',
            'data' => $contract,
        ]);
    }

    /**
     * Xóa hợp đồng gốc
     */
    public function destroy($id): JsonResponse
    {
        $contract = ClientContract::find($id);

        if (! $contract) {
            return response()->json(['message' => 'Không tìm thấy hợp đồng'], 404);
        }

        // Quy tắc xóa hợp đồng gốc:
        // Tuyệt đối không cho phép xóa hợp đồng khách hàng nếu:
        // 1. Hợp đồng đó đã "Có hiệu lực" (status != DRAFT)
        // 2. Hoặc đã "Phát sinh đợt thanh toán/Thu tiền" từ khách hàng (payment_type = REVENUE)
        if ($contract->status !== 'DRAFT') {
            return response()->json([
                'message' => 'Không được phép xóa hợp đồng đã có hiệu lực hoặc đã hoàn thành/chấm dứt.',
            ], 400);
        }

        $hasPayment = ProjectPayment::where('client_contract_id', $id)
            ->where('payment_type', 'THU')
            ->exists();

        if ($hasPayment) {
            return response()->json([
                'message' => 'Hợp đồng này đã phát sinh đợt thanh toán/thu tiền thực tế từ khách hàng, không thể xóa.',
            ], 400);
        }

        DB::beginTransaction();
        try {
            // Lấy danh sách các tài liệu liên kết để dọn dẹp (nếu cần)
            $documentIds = $contract->documents()->pluck('id')->toArray();

            // Hủy liên kết bảng pivot (tự động cascade ở db) và xóa hợp đồng
            $contract->delete();

            // Dọn dẹp tài liệu dự án tương ứng nếu không được liên kết bởi nơi nào khác
            if (! empty($documentIds)) {
                ProjectDocument::whereIn('id', $documentIds)->delete();
            }

            DB::commit();

            app(\App\Services\ProjectCustomerNotificationService::class)->notify(
                $contract->project,
                'Hợp đồng khách hàng đã bị xóa',
                'Hợp đồng "'.$contract->contract_name.'" (mã '.$contract->contract_code.') đã được xóa khỏi hệ thống.',
                'CLIENT_CONTRACT_DELETED',
                $contract->id
            );

            return response()->json(['message' => 'Xóa hợp đồng thành công']);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json(['message' => 'Lỗi hệ thống khi xóa hợp đồng', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Tải lên và liên kết tài liệu vào hợp đồng khách hàng
     */
    public function uploadDocuments(Request $request, $id): JsonResponse
    {
        $contract = ClientContract::find($id);
        if (! $contract) {
            return response()->json(['message' => 'Không tìm thấy hợp đồng'], 404);
        }

        $validator = Validator::make($request->all(), [
            'document_files' => 'required|array|min:1',
            'document_files.*' => 'required|file|allowed_extensions:pdf,doc,docx,xls,xlsx,jpg,jpeg,png,zip|max:20480',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Tệp đính kèm không hợp lệ', 'errors' => $validator->errors()], 422);
        }

        $docType = DocumentType::firstOrCreate(
            ['type_name' => 'Hợp đồng khách hàng']
        );

        $uploadedDocs = [];

        DB::beginTransaction();
        try {
            foreach ($request->file('document_files') as $file) {
                $path = $file->store('documents', 'public');
                $fileUrl = asset('storage/'.$path);

                $document = new ProjectDocument;
                $document->project_id = $contract->project_id;
                $document->document_name = $file->getClientOriginalName();
                $document->document_type_id = $docType->id;
                $document->file_url = $fileUrl;
                $document->status = $contract->document_status;

                $contract->documents()->save($document);
                $uploadedDocs[] = $document;
            }

            DB::commit();

            return response()->json([
                'message' => 'Tải lên tài liệu thành công',
                'data' => $uploadedDocs,
            ], 200);

        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json(['message' => 'Lỗi hệ thống khi tải lên tài liệu', 'error' => $e->getMessage()], 500);
        }
    }
}
