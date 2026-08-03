<?php

namespace App\Http\Controllers;

use App\Models\ContractAddendum;
use App\Models\DocumentType;
use App\Models\ProjectDocument;
use App\Models\SubContract;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class SubContractAddendumController extends Controller
{
    /**
     * Danh sách phụ lục của hợp đồng thầu phụ
     */
    public function index($subContractId): JsonResponse
    {
        $contract = SubContract::find($subContractId);

        if (! $contract) {
            return response()->json(['message' => 'Không tìm thấy hợp đồng thầu phụ'], 404);
        }

        $addendums = ContractAddendum::with('documents')
            ->where('sub_contract_id', $subContractId)
            ->orderBy('id', 'desc')
            ->get();

        return response()->json($addendums);
    }

    /**
     * Tạo phụ lục hợp đồng thầu phụ mới
     */
    public function store(Request $request, $subContractId): JsonResponse
    {
        $contract = SubContract::find($subContractId);

        if (! $contract) {
            return response()->json(['message' => 'Không tìm thấy hợp đồng thầu phụ'], 404);
        }

        if ($contract->project && $contract->project->getRawOriginal('status') === 'Đã hoàn thành') {
            return response()->json(['message' => 'Dự án đã hoàn thành, không thể thêm phụ lục hợp đồng thầu phụ mới.'], 400);
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
            // Tự động sinh mã phụ lục thầu phụ (PLTP-xxxx)
            $lastAddendum = ContractAddendum::orderBy('id', 'desc')->first();
            $nextId = $lastAddendum ? $lastAddendum->id + 1 : 1;
            $addendumCode = 'PLTP-'.str_pad($nextId, 4, '0', STR_PAD_LEFT);

            $addendum = new ContractAddendum;
            $addendum->sub_contract_id = $subContractId;
            $addendum->addendum_code = $addendumCode;
            $addendum->title = $request->title;
            $addendum->value_adjustment = $request->value_adjustment;
            $addendum->signed_date = $request->signed_date;
            $addendum->status = 'ACTIVE'; // Có hiệu lực ngay sau khi lưu
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
                $document->document_name = 'Tài liệu phụ lục thầu phụ '.$addendumCode;
                $document->document_type_id = $docType->id;
                $document->file_url = $fileUrl;
                $document->status = 'ACTIVE';

                // Liên kết tài liệu
                $addendum->documents()->save($document);
            }

            DB::commit();

            return response()->json([
                'message' => 'Lập phụ lục hợp đồng thầu phụ thành công',
                'data' => $addendum->load('documents'),
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json(['message' => 'Lỗi hệ thống khi tạo phụ lục', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Cập nhật phụ lục hợp đồng thầu phụ
     */
    public function update(Request $request, $id): JsonResponse
    {
        $addendum = ContractAddendum::find($id);

        if (! $addendum) {
            return response()->json(['message' => 'Không tìm thấy phụ lục hợp đồng thầu phụ'], 404);
        }

        if ($addendum->subContract && $addendum->subContract->project && $addendum->subContract->project->getRawOriginal('status') === 'Đã hoàn thành') {
            return response()->json(['message' => 'Dự án đã hoàn thành, không thể chỉnh sửa phụ lục hợp đồng thầu phụ.'], 400);
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

        // Khóa các trường addendum_code và sub_contract_id không cho chỉnh sửa
        $addendum->title = $request->title;
        $addendum->value_adjustment = $request->value_adjustment;
        $addendum->signed_date = $request->signed_date;
        $addendum->status = $request->status;
        $addendum->save();

        return response()->json([
            'message' => 'Cập nhật phụ lục hợp đồng thầu phụ thành công',
            'data' => $addendum,
        ]);
    }

    /**
     * Xóa phụ lục hợp đồng thầu phụ
     */
    public function destroy($id): JsonResponse
    {
        $addendum = ContractAddendum::find($id);

        if (! $addendum) {
            return response()->json(['message' => 'Không tìm thấy phụ lục hợp đồng thầu phụ'], 404);
        }

        if ($addendum->status === 'ACTIVE') {
            return response()->json(['message' => 'Phụ lục đang hiệu lực không thể bị xóa.'], 400);
        }

        if ($addendum->subContract && $addendum->subContract->project && $addendum->subContract->project->getRawOriginal('status') === 'Đã hoàn thành') {
            return response()->json(['message' => 'Dự án đã hoàn thành, không thể xóa phụ lục hợp đồng thầu phụ.'], 400);
        }

        DB::beginTransaction();
        try {
            // Lấy tài liệu liên kết để dọn dẹp
            $documentIds = $addendum->documents()->pluck('id')->toArray();

            // Xóa phụ lục
            $addendum->delete();

            // Dọn dẹp tài liệu dự án tương ứng nếu không liên kết nơi khác
            if (! empty($documentIds)) {
                ProjectDocument::whereIn('id', $documentIds)->delete();
            }

            DB::commit();

            return response()->json(['message' => 'Xóa phụ lục hợp đồng thầu phụ thành công']);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json(['message' => 'Lỗi hệ thống khi xóa phụ lục', 'error' => $e->getMessage()], 500);
        }
    }
}
