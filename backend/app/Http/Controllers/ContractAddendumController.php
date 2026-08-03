<?php

namespace App\Http\Controllers;

use App\Models\ClientContract;
use App\Models\ContractAddendum;
use App\Models\DocumentType;
use App\Models\ProjectDocument;
use App\Services\ProjectCustomerNotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class ContractAddendumController extends Controller
{
    /**
     * Danh sách phụ lục của hợp đồng khách hàng
     */
    public function index($contractId): JsonResponse
    {
        $contract = ClientContract::find($contractId);

        if (! $contract) {
            return response()->json(['message' => 'Không tìm thấy hợp đồng khách hàng'], 404);
        }

        $addendums = ContractAddendum::with('documents')
            ->where('client_contract_id', $contractId)
            ->orderBy('id', 'desc')
            ->get();

        return response()->json($addendums);
    }

    /**
     * Chi tiết phụ lục hợp đồng
     */
    public function show($id): JsonResponse
    {
        $addendum = ContractAddendum::with(['clientContract', 'documents'])->find($id);

        if (! $addendum) {
            return response()->json(['message' => 'Không tìm thấy phụ lục hợp đồng'], 404);
        }

        return response()->json($addendum);
    }

    /**
     * Tạo phụ lục hợp đồng mới
     */
    public function store(Request $request, $contractId): JsonResponse
    {
        $contract = ClientContract::find($contractId);

        if (! $contract) {
            return response()->json(['message' => 'Không tìm thấy hợp đồng khách hàng'], 404);
        }

        if ($contract->project && $contract->project->getRawOriginal('status') === 'Đã hoàn thành') {
            return response()->json(['message' => 'Dự án đã hoàn thành, không thể thêm phụ lục hợp đồng mới.'], 400);
        }

        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'value_adjustment' => 'required|numeric',
            'signed_date' => 'nullable|date',
            'document_file' => 'nullable|file|allowed_extensions:pdf,doc,docx,xls,xlsx,jpg,jpeg,png,zip|max:20480',
            'document_files' => 'nullable|array',
            'document_files.*' => 'required|file|allowed_extensions:pdf,doc,docx,xls,xlsx,jpg,jpeg,png,zip|max:20480',
            'file_url' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => $validator->errors()->first(), 'errors' => $validator->errors()], 422);
        }

        DB::beginTransaction();
        try {
            // Tự động sinh mã phụ lục (PL-xxxx)
            $lastAddendum = ContractAddendum::orderBy('id', 'desc')->first();
            $nextId = $lastAddendum ? $lastAddendum->id + 1 : 1;
            $addendumCode = 'PL-'.str_pad($nextId, 4, '0', STR_PAD_LEFT);

            $addendum = new ContractAddendum;
            $addendum->client_contract_id = $contractId;
            $addendum->addendum_code = $addendumCode;
            $addendum->title = $request->title;
            $addendum->value_adjustment = $request->value_adjustment;
            $addendum->signed_date = $request->signed_date;
            $addendum->status = 'ACTIVE'; // Mặc định phụ lục hoạt động ngay sau khi lưu
            $addendum->save();

            // Đảm bảo loại tài liệu "Phụ lục hợp đồng" tồn tại
            $docType = DocumentType::firstOrCreate(
                ['type_name' => 'Phụ lục hợp đồng']
            );

            // Xử lý tải lên nhiều file (document_files)
            if ($request->hasFile('document_files')) {
                foreach ($request->file('document_files') as $file) {
                    $path = $file->store('documents', 'public');
                    $fileUrl = asset('storage/'.$path);

                    $document = new ProjectDocument;
                    $document->project_id = $contract->project_id;
                    $document->document_name = $file->getClientOriginalName();
                    $document->document_type_id = $docType->id;
                    $document->file_url = $fileUrl;
                    $document->status = 'ACTIVE';

                    $addendum->documents()->save($document);
                }
            }

            // Xử lý tệp đơn lẻ (backward compatibility)
            $fileUrl = null;
            if ($request->hasFile('document_file')) {
                $file = $request->file('document_file');
                $path = $file->store('documents', 'public');
                $fileUrl = asset('storage/'.$path);
            } elseif ($request->filled('file_url')) {
                $fileUrl = $request->file_url;
            }

            if ($fileUrl) {
                // Tạo tài liệu dự án
                $document = new ProjectDocument;
                $document->project_id = $contract->project_id;
                $document->document_name = 'Tài liệu phụ lục '.$addendumCode;
                $document->document_type_id = $docType->id;
                $document->file_url = $fileUrl;
                $document->status = 'ACTIVE';

                // Liên kết phụ lục với tài liệu
                $addendum->documents()->save($document);
            }

            DB::commit();

            app(ProjectCustomerNotificationService::class)->notify(
                $contract->project,
                'Phụ lục hợp đồng mới',
                'Phụ lục "'.$addendum->title.'" (mã '.$addendum->addendum_code.') đã được tạo cho hợp đồng "'.$contract->contract_name.'" của dự án "'.$contract->project?->name.'".',
                'CONTRACT_ADDENDUM_CREATED',
                $addendum->id
            );

            return response()->json([
                'message' => 'Lập phụ lục hợp đồng thành công',
                'data' => $addendum->load('documents'),
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json(['message' => 'Lỗi hệ thống khi tạo phụ lục', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Cập nhật phụ lục hợp đồng
     */
    public function update(Request $request, $id): JsonResponse
    {
        $addendum = ContractAddendum::find($id);

        if (! $addendum) {
            return response()->json(['message' => 'Không tìm thấy phụ lục hợp đồng'], 404);
        }

        if ($addendum->clientContract && $addendum->clientContract->project && $addendum->clientContract->project->getRawOriginal('status') === 'Đã hoàn thành') {
            return response()->json(['message' => 'Dự án đã hoàn thành, không thể chỉnh sửa phụ lục hợp đồng.'], 400);
        }

        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'value_adjustment' => 'required|numeric',
            'signed_date' => 'nullable|date',
            'status' => 'required|in:DRAFT,ACTIVE,REJECTED',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => $validator->errors()->first(), 'errors' => $validator->errors()], 422);
        }

        // Khóa addendum_code và client_contract_id không cho sửa đổi
        $addendum->title = $request->title;
        $addendum->value_adjustment = $request->value_adjustment;
        $addendum->signed_date = $request->signed_date;
        $addendum->status = $request->status;
        $addendum->save();

        app(ProjectCustomerNotificationService::class)->notify(
            $addendum->clientContract?->project,
            'Phụ lục hợp đồng đã được cập nhật',
            'Phụ lục "'.$addendum->title.'" (mã '.$addendum->addendum_code.') vừa được cập nhật trạng thái thành "'.$addendum->status.'".',
            'CONTRACT_ADDENDUM_UPDATED',
            $addendum->id
        );

        return response()->json([
            'message' => 'Cập nhật phụ lục hợp đồng thành công',
            'data' => $addendum,
        ]);
    }

    /**
     * Xóa phụ lục hợp đồng
     */
    public function destroy($id): JsonResponse
    {
        $addendum = ContractAddendum::find($id);

        if (! $addendum) {
            return response()->json(['message' => 'Không tìm thấy phụ lục hợp đồng'], 404);
        }

        if ($addendum->status === 'ACTIVE') {
            return response()->json(['message' => 'Phụ lục đang hiệu lực không thể bị xóa.'], 400);
        }

        if ($addendum->clientContract && $addendum->clientContract->project && $addendum->clientContract->project->getRawOriginal('status') === 'Đã hoàn thành') {
            return response()->json(['message' => 'Dự án đã hoàn thành, không thể xóa phụ lục hợp đồng.'], 400);
        }

        DB::beginTransaction();
        try {
            // Lấy các tài liệu liên kết để dọn dẹp
            $documentIds = $addendum->documents()->pluck('id')->toArray();

            // Xóa phụ lục (cascade sẽ xóa liên kết ở addendum_documents)
            $addendum->delete();

            // Dọn dẹp tài liệu dự án tương ứng nếu không liên kết nơi khác
            if (! empty($documentIds)) {
                ProjectDocument::whereIn('id', $documentIds)->delete();
            }

            DB::commit();

            app(ProjectCustomerNotificationService::class)->notify(
                $addendum->clientContract?->project,
                'Phụ lục hợp đồng đã bị xóa',
                'Phụ lục "'.$addendum->title.'" (mã '.$addendum->addendum_code.') đã được xóa khỏi hệ thống.',
                'CONTRACT_ADDENDUM_DELETED',
                $addendum->id
            );

            return response()->json(['message' => 'Xóa phụ lục hợp đồng thành công']);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json(['message' => 'Lỗi hệ thống khi xóa phụ lục', 'error' => $e->getMessage()], 500);
        }
    }
}
