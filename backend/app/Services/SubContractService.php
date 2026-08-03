<?php

namespace App\Services;

use App\Models\DetailContractContractor;
use App\Models\DocumentType;
use App\Models\ProjectDocument;
use App\Models\ProjectPayment;
use App\Models\SubContract;
use App\Models\TaskDetail;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SubContractService
{
    /**
     * Lập hợp đồng nhà thầu phụ mới
     */
    public function store(
        array $data,
        ?array $documentFiles = null,
        ?UploadedFile $singleDocumentFile = null,
        ?string $fileUrl = null
    ): SubContract {
        $subcontractorsData = $data['subcontractors'] ?? [];
        $ids = [];
        $totalPercentage = 0.0;

        foreach ($subcontractorsData as $sub) {
            $subId = $sub['subcontractor_id'];
            if (in_array($subId, $ids)) {
                throw ValidationException::withMessages([
                    'subcontractors' => ['Nhà thầu phụ bị trùng lặp trong hợp đồng.'],
                ]);
            }
            $ids[] = $subId;
        }

        return DB::transaction(function () use ($data, $subcontractorsData, $documentFiles, $singleDocumentFile, $fileUrl) {
            // Tự động sinh mã hợp đồng nhà thầu phụ (HDTP-xxxx)
            $lastContract = SubContract::orderBy('id', 'desc')->first();
            $nextId = $lastContract ? $lastContract->id + 1 : 1;
            $contractCode = 'HDTP-'.str_pad($nextId, 4, '0', STR_PAD_LEFT);

            $contract = new SubContract;
            $contract->project_id = $data['project_id'];
            $contract->contract_code = $contractCode;
            $contract->contract_name = $data['contract_name'] ?? null;
            $contract->contract_value = $data['contract_value'];
            $contract->signed_date = $data['signed_date'] ?? null;
            $contract->status = 'ACTIVE'; // Mặc định có hiệu lực ngay
            $contract->save();

            foreach ($subcontractorsData as $sub) {
                DetailContractContractor::create([
                    'sub_contract_id' => $contract->id,
                    'subcontractor_id' => $sub['subcontractor_id'],
                ]);
            }

            // Xử lý loại tài liệu "Hợp đồng nhà thầu phụ"
            $docType = DocumentType::firstOrCreate(
                ['type_name' => 'Hợp đồng nhà thầu phụ']
            );

            // Xử lý tải lên nhiều file
            if ($documentFiles) {
                foreach ($documentFiles as $file) {
                    if ($file instanceof UploadedFile) {
                        $path = $file->store('documents', 'public');
                        $fileUrlAttr = asset('storage/'.$path);

                        $document = new ProjectDocument;
                        $document->project_id = $contract->project_id;
                        $document->document_name = $file->getClientOriginalName();
                        $document->document_type_id = $docType->id;
                        $document->file_url = $fileUrlAttr;
                        $document->status = 'ACTIVE';

                        $contract->documents()->save($document);
                    }
                }
            }

            // Xử lý tải lên file đơn lẻ (backward compatibility)
            if ($singleDocumentFile) {
                $path = $singleDocumentFile->store('documents', 'public');
                $fileUrlAttr = asset('storage/'.$path);

                $document = new ProjectDocument;
                $document->project_id = $contract->project_id;
                $document->document_name = $singleDocumentFile->getClientOriginalName();
                $document->document_type_id = $docType->id;
                $document->file_url = $fileUrlAttr;
                $document->status = 'ACTIVE';

                $contract->documents()->save($document);
            } elseif ($fileUrl) {
                $document = new ProjectDocument;
                $document->project_id = $contract->project_id;
                $document->document_name = 'Tài liệu hợp đồng thầu phụ '.$contractCode;
                $document->document_type_id = $docType->id;
                $document->file_url = $fileUrl;
                $document->status = 'ACTIVE';

                $contract->documents()->save($document);
            }

            return $contract;
        });
    }

    /**
     * Cập nhật thông tin hợp đồng nhà thầu phụ
     */
    public function update(SubContract $contract, array $data): SubContract
    {
        $subcontractorsData = $data['subcontractors'] ?? null;
        if ($subcontractorsData) {
            $ids = [];
            $totalPercentage = 0.0;
            foreach ($subcontractorsData as $sub) {
                $subId = $sub['subcontractor_id'];
                if (in_array($subId, $ids)) {
                    throw ValidationException::withMessages([
                        'subcontractors' => ['Nhà thầu phụ bị trùng lặp trong hợp đồng.'],
                    ]);
                }
                $ids[] = $subId;
            }
        }

        return DB::transaction(function () use ($contract, $data, $subcontractorsData) {
            // Khóa các thông tin cốt lõi mang tính định danh: không cập nhật project_id và contract_code
            $contract->contract_name = $data['contract_name'] ?? $contract->contract_name;
            $contract->contract_value = $data['contract_value'];
            $contract->signed_date = $data['signed_date'] ?? null;
            $contract->status = $data['status'];
            $contract->save();

            // Cập nhật nhà thầu phụ thực hiện (nếu truyền lên)
            if ($subcontractorsData) {
                $existing = DetailContractContractor::where('sub_contract_id', $contract->id)->get()->keyBy('subcontractor_id');
                $keepIds = [];

                foreach ($subcontractorsData as $sub) {
                    $subcontractorId = $sub['subcontractor_id'];
                    $keepIds[] = $subcontractorId;

                    if (!isset($existing[$subcontractorId])) {
                        // Thêm mới liên kết nhà thầu phụ
                        DetailContractContractor::create([
                            'sub_contract_id' => $contract->id,
                            'subcontractor_id' => $subcontractorId,
                        ]);
                    }
                }

                // Xử lý các nhà thầu phụ bị gỡ bỏ khỏi hợp đồng
                $removed = $existing->filter(function ($record) use ($keepIds) {
                    return ! in_array($record->subcontractor_id, $keepIds);
                });
                foreach ($removed as $record) {
                    $hasTasks = TaskDetail::where('contractor_detail_id', $record->id)->exists();
                    if ($hasTasks) {
                        $subName = $record->subcontractor->user->full_name ?? $record->subcontractor->subcontractor_code;
                        throw ValidationException::withMessages([
                            'subcontractors' => ["Nhà thầu phụ '{$subName}' đã được giao công việc trong dự án, không thể xóa khỏi hợp đồng."],
                        ]);
                    }
                    $record->delete();
                }
            }

            return $contract;
        });
    }

    /**
     * Xóa hợp đồng nhà thầu phụ
     */
    public function destroy(SubContract $contract): void
    {
        // Tuyệt đối không cho phép xóa nếu hợp đồng đã có hiệu lực (status != DRAFT)
        if ($contract->status !== 'DRAFT') {
            throw new \InvalidArgumentException('Không được phép xóa hợp đồng thầu phụ đã có hiệu lực hoặc đã hoàn thành/chấm dứt.');
        }

        // Hoặc đã phát sinh thanh toán khối lượng cho nhà thầu phụ (payment_type = COST)
        $hasPayment = ProjectPayment::where('sub_contract_id', $contract->id)
            ->where('payment_type', 'CHI')
            ->exists();

        if ($hasPayment) {
            throw new \InvalidArgumentException('Hợp đồng thầu phụ này đã phát sinh thanh toán khối lượng thực tế, không thể xóa.');
        }

        DB::transaction(function () use ($contract) {
            // Lấy danh sách các tài liệu liên kết để dọn dẹp
            $documentIds = $contract->documents()->pluck('id')->toArray();

            // Xóa hợp đồng
            $contract->delete();

            // Dọn dẹp tài liệu dự án tương ứng nếu không được liên kết nơi khác
            if (! empty($documentIds)) {
                ProjectDocument::whereIn('id', $documentIds)->delete();
            }
        });
    }

    /**
     * Tải lên và liên kết tài liệu vào hợp đồng thầu phụ
     */
    public function uploadDocuments(SubContract $contract, array $documentFiles): array
    {
        $docType = DocumentType::firstOrCreate(
            ['type_name' => 'Hợp đồng nhà thầu phụ']
        );

        $uploadedDocs = [];

        DB::transaction(function () use ($contract, $documentFiles, $docType, &$uploadedDocs) {
            foreach ($documentFiles as $file) {
                if ($file instanceof UploadedFile) {
                    $path = $file->store('documents', 'public');
                    $fileUrl = asset('storage/'.$path);

                    $document = new ProjectDocument;
                    $document->project_id = $contract->project_id;
                    $document->document_name = $file->getClientOriginalName();
                    $document->document_type_id = $docType->id;
                    $document->file_url = $fileUrl;
                    $document->status = 'ACTIVE';

                    $contract->documents()->save($document);
                    $uploadedDocs[] = $document;
                }
            }
        });

        return $uploadedDocs;
    }
}
