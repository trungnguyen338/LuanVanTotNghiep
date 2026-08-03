<?php

namespace App\Http\Controllers;

use App\Models\DocumentType;
use App\Models\ProjectDocument;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class ProjectDocumentController extends Controller
{
    private const DOCUMENT_STATUSES = [
        'DRAFT',
        'ACTIVE',
        'ARCHIVED',
    ];

    private const RETIRED_DOCUMENT_TYPES = [
        'Hợp đồng nhà cung cấp',
    ];

    private const PROTECTED_DELETE_DOCUMENT_TYPES = [
        'Hợp đồng khách hàng',
        'Hợp đồng thầu phụ',
        'Hợp đồng nhà thầu phụ',
        'Phụ lục hợp đồng',
    ];

    private const RESTRICTED_UPLOAD_DOCUMENT_TYPES = [
        'Hợp đồng khách hàng',
        'Hợp đồng thầu phụ',
        'Hợp đồng nhà thầu phụ',
        'Phụ lục hợp đồng',
    ];

    /**
     * Get all document types.
     */
    public function documentTypes(): JsonResponse
    {
        $types = DocumentType::whereNotIn('type_name', self::RETIRED_DOCUMENT_TYPES)
            ->orderBy('id', 'asc')
            ->get();

        return response()->json($types);
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        $query = ProjectDocument::with(['project', 'documentType']);

        if ($request->filled('project_id')) {
            $query->where('project_id', $request->project_id);
        }

        if ($request->filled('document_type_id')) {
            $query->where('type_id', $request->document_type_id);
        }

        if ($request->filled('search')) {
            $query->where('doc_name', 'like', '%'.$request->search.'%');
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $documents = $query->orderBy('id', 'desc')->get();

        // Append is_locked attribute dynamically
        $formatted = $documents->map(function ($doc) {
            $doc->is_locked = $this->isDocumentLocked($doc);

            return $doc;
        });

        return response()->json($formatted);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'document_name' => 'required|string|max:255',
            'project_id' => 'required|exists:projects,id',
            'document_type_id' => 'required|exists:document_types,id',
            'status' => 'nullable|in:'.implode(',', self::DOCUMENT_STATUSES),
            'file' => 'nullable|file|max:20480|allowed_extensions:pdf,doc,docx,xls,xlsx,png,jpg,jpeg,webp',
            'files' => 'nullable|array',
            'files.*' => 'file|max:20480|allowed_extensions:pdf,doc,docx,xls,xlsx,png,jpg,jpeg,webp',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors(),
            ], 422);
        }

        $project = \App\Models\Project::find($request->project_id);
        if ($project && $project->getRawOriginal('status') === 'Đã hoàn thành') {
            return response()->json(['message' => 'Dự án đã hoàn thành, không thể thêm hồ sơ tài liệu mới.'], 400);
        }

        if (! $this->isSelectableDocumentType((int) $request->document_type_id)) {
            return response()->json([
                'message' => 'Loại tài liệu này đã ngưng sử dụng. Vui lòng chọn phân loại khác.',
            ], 422);
        }

        if ($this->isRestrictedUploadDocumentType((int) $request->document_type_id)) {
            return response()->json([
                'message' => 'Không thể tải lên mới với phân loại hợp đồng khách hàng, hợp đồng thầu phụ hoặc phụ lục hợp đồng.',
            ], 422);
        }

        if (! $request->hasFile('file') && ! $request->hasFile('files')) {
            return response()->json(['message' => 'Không tìm thấy tệp tải lên'], 422);
        }

        $documentsCreated = [];

        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $path = $file->store('documents', 'public');
            $fileUrl = asset('storage/'.$path);

            $document = new ProjectDocument;
            $document->project_id = $request->project_id;
            $document->document_name = $request->document_name;
            $document->document_type_id = $request->document_type_id;
            $document->file_url = $fileUrl;
            $document->status = $request->input('status', 'ACTIVE');
            $document->save();

            $document->is_locked = $this->isDocumentLocked($document);
            $documentsCreated[] = $document->load(['project', 'documentType']);
        }

        if ($request->hasFile('files')) {
            $files = $request->file('files');
            foreach ($files as $file) {
                $path = $file->store('documents', 'public');
                $fileUrl = asset('storage/'.$path);

                $originalName = $file->getClientOriginalName();
                $docName = count($files) > 1 
                    ? $request->document_name . ' (' . $originalName . ')'
                    : $request->document_name;

                $document = new ProjectDocument;
                $document->project_id = $request->project_id;
                $document->document_name = $docName;
                $document->document_type_id = $request->document_type_id;
                $document->file_url = $fileUrl;
                $document->status = $request->input('status', 'ACTIVE');
                $document->save();

                $document->is_locked = $this->isDocumentLocked($document);
                $documentsCreated[] = $document->load(['project', 'documentType']);
            }
        }

        return response()->json([
            'message' => 'Tải lên tài liệu thành công',
            'data' => count($documentsCreated) === 1 ? $documentsCreated[0] : $documentsCreated,
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show($id): JsonResponse
    {
        $document = ProjectDocument::with(['project', 'documentType'])->find($id);

        if (! $document) {
            return response()->json(['message' => 'Không tìm thấy tài liệu'], 404);
        }

        $document->is_locked = $this->isDocumentLocked($document);

        return response()->json($document);
    }

    /**
     * Stream a document through the authenticated API instead of exposing storage paths directly.
     */
    public function download($id)
    {
        $document = ProjectDocument::with('documentType')->find($id);

        if (! $document) {
            return response()->json(['message' => 'Không tìm thấy tài liệu'], 404);
        }

        $path = $this->resolveStoredPath($document);

        if (! $path) {
            return response()->json(['message' => 'Tài liệu chưa có tệp đính kèm'], 404);
        }

        if (filter_var($path, FILTER_VALIDATE_URL)) {
            return redirect()->away($path);
        }

        if (! Storage::disk('public')->exists($path)) {
            return response()->json(['message' => 'Không tìm thấy tệp vật lý trong kho lưu trữ'], 404);
        }

        return Storage::disk('public')->download($path, $this->buildDownloadFilename($document, $path));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id): JsonResponse
    {
        $document = ProjectDocument::with('documentType')->find($id);

        if (! $document) {
            return response()->json(['message' => 'Không tìm thấy tài liệu'], 404);
        }

        if ($document->project && $document->project->getRawOriginal('status') === 'Đã hoàn thành') {
            return response()->json(['message' => 'Dự án đã hoàn thành, không thể chỉnh sửa hồ sơ tài liệu.'], 400);
        }

        $validator = Validator::make($request->all(), [
            'document_name' => 'required|string|max:255',
            'project_id' => 'required|exists:projects,id',
            'document_type_id' => 'required|exists:document_types,id',
            'status' => 'nullable|in:'.implode(',', self::DOCUMENT_STATUSES),
            'file' => 'nullable|file|max:20480|allowed_extensions:pdf,doc,docx,xls,xlsx,png,jpg,jpeg,webp',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors(),
            ], 422);
        }

        if (
            (int) $request->document_type_id !== (int) $document->getRawOriginal('type_id') &&
            ! $this->isSelectableDocumentType((int) $request->document_type_id)
        ) {
            return response()->json([
                'message' => 'Loại tài liệu này đã ngưng sử dụng. Vui lòng chọn phân loại khác.',
            ], 422);
        }

        if (
            (int) $request->document_type_id !== (int) $document->getRawOriginal('type_id') &&
            $this->isRestrictedUploadDocumentType((int) $request->document_type_id)
        ) {
            return response()->json([
                'message' => 'Không thể đổi sang phân loại hợp đồng khách hàng, hợp đồng thầu phụ hoặc phụ lục hợp đồng.',
            ], 422);
        }

        if (
            (int) $request->document_type_id !== (int) $document->getRawOriginal('type_id') &&
            $this->isDeleteProtectedDocument($document)
        ) {
            return response()->json([
                'message' => 'Không thể đổi phân loại của tài liệu thuộc hợp đồng hoặc phụ lục hợp đồng.',
            ], 400);
        }

        if ($request->hasFile('file')) {
            // Delete old physical file
            if ($oldPath = $this->resolveStoredPath($document)) {
                Storage::disk('public')->delete($oldPath);
            }

            $file = $request->file('file');
            $path = $file->store('documents', 'public');
            $document->file_url = $path;
        }

        $document->document_name = $request->document_name;
        $document->project_id = $request->project_id;
        $document->document_type_id = $request->document_type_id;
        $document->status = $request->input('status', $document->status ?: 'ACTIVE');
        $document->save();

        $document->is_locked = $this->isDocumentLocked($document);

        return response()->json([
            'message' => 'Cập nhật tài liệu thành công',
            'data' => $document->load(['project', 'documentType']),
        ]);
    }

    /**
     * Update only the business status.
     */
    public function updateStatus(Request $request, $id): JsonResponse
    {
        $document = ProjectDocument::find($id);

        if (! $document) {
            return response()->json(['message' => 'Không tìm thấy tài liệu'], 404);
        }

        $validator = Validator::make($request->all(), [
            'status' => 'required|in:'.implode(',', self::DOCUMENT_STATUSES),
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors(),
            ], 422);
        }

        $document->status = $request->status;
        $document->save();
        $document->is_locked = $this->isDocumentLocked($document);

        return response()->json([
            'message' => 'Cập nhật trạng thái tài liệu thành công',
            'data' => $document->load(['project', 'documentType']),
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id): JsonResponse
    {
        $document = ProjectDocument::find($id);

        if (! $document) {
            return response()->json(['message' => 'Không tìm thấy tài liệu'], 404);
        }

        if ($document->project && $document->project->getRawOriginal('status') === 'Đã hoàn thành') {
            return response()->json(['message' => 'Dự án đã hoàn thành, không thể xóa hồ sơ tài liệu.'], 400);
        }

        if ($this->isDeleteProtectedDocument($document)) {
            return response()->json([
                'message' => 'Không thể xóa tài liệu thuộc phân loại Hợp đồng khách hàng, Hợp đồng thầu phụ hoặc Phụ lục hợp đồng.',
            ], 400);
        }

        if ($oldPath = $this->resolveStoredPath($document)) {
            Storage::disk('public')->delete($oldPath);
        }

        $document->delete();

        return response()->json(['message' => 'Xóa tài liệu thành công']);
    }

    /**
     * Check if a document is locked based on being linked or legal types.
     */
    private function isDocumentLocked(ProjectDocument $document): bool
    {
        if ($document->documentable_id && $document->documentable_type) {
            return true;
        }

        if ($document->documentType && in_array($document->documentType->type_name, [
            'Hợp đồng khách hàng',
            'Hợp đồng thầu phụ',
            'Hợp đồng nhà thầu phụ',
            'Phụ lục hợp đồng',
            'Biên bản nghiệm thu',
            'Biên bản thanh toán',
        ])) {
            return true;
        }

        return false;
    }

    private function isDeleteProtectedDocument(ProjectDocument $document): bool
    {
        return $document->documentType
            && in_array($document->documentType->type_name, self::PROTECTED_DELETE_DOCUMENT_TYPES, true);
    }

    private function isSelectableDocumentType(int $documentTypeId): bool
    {
        return DocumentType::whereKey($documentTypeId)
            ->whereNotIn('type_name', self::RETIRED_DOCUMENT_TYPES)
            ->exists();
    }

    private function isRestrictedUploadDocumentType(int $documentTypeId): bool
    {
        return DocumentType::whereKey($documentTypeId)
            ->whereIn('type_name', self::RESTRICTED_UPLOAD_DOCUMENT_TYPES)
            ->exists();
    }

    private function resolveStoredPath(ProjectDocument $document): ?string
    {
        $path = $document->getRawOriginal('file_path');

        if (! $path) {
            return null;
        }

        if (filter_var($path, FILTER_VALIDATE_URL)) {
            $storagePosition = strpos($path, '/storage/');

            if ($storagePosition === false) {
                return $path;
            }

            return substr($path, $storagePosition + strlen('/storage/'));
        }

        $path = ltrim($path, '/');

        if (str_starts_with($path, 'storage/')) {
            return substr($path, strlen('storage/'));
        }

        return $path;
    }

    private function buildDownloadFilename(ProjectDocument $document, string $path): string
    {
        $fileName = trim((string) ($document->document_name ?: basename($path)));
        $extension = pathinfo($path, PATHINFO_EXTENSION);

        if ($extension && ! Str::endsWith(Str::lower($fileName), '.'.Str::lower($extension))) {
            $fileName .= '.'.$extension;
        }

        return $fileName;
    }
}
