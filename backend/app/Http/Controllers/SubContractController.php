<?php

namespace App\Http\Controllers;

use App\Models\SubContract;
use App\Models\TaskDetail;
use App\Services\SubContractService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class SubContractController extends Controller
{
    protected $subContractService;

    private function isTerminatedSubContract(SubContract $contract): bool
    {
        return in_array($contract->status, ['TERMINATED', 'CANCELLED', 'Bị hủy'], true)
            || in_array($contract->getRawOriginal('status'), ['TERMINATED', 'CANCELLED', 'Bị hủy'], true);
    }

    public function __construct(SubContractService $subContractService)
    {
        $this->subContractService = $subContractService;
    }

    /**
     * Lấy danh sách hợp đồng nhà thầu phụ (kèm tổng giá trị thực tế)
     */
    public function index(Request $request): JsonResponse
    {
        $query = SubContract::with(['project', 'subcontractors'])
            ->withSum(['addendums as addendums_sum' => function ($q) {
                $q->where('status', 'Có hiệu lực');
            }], 'value_adjustment');

        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('contract_code', 'LIKE', "%{$search}%")
                    ->orWhereHas('project', function ($qp) use ($search) {
                        $qp->where('name', 'LIKE', "%{$search}%");
                    });
            });
        }

        if ($request->has('project_id')) {
            $query->where('project_id', $request->input('project_id'));
        }

        if ($request->has('status')) {
            $query->where('status', $request->input('status'));
        }

        $contracts = $query->orderBy('id', 'desc')->get();

        // Tính toán tổng giá trị thực tế = gốc + các phụ lục ACTIVE
        $formattedContracts = $contracts->map(function ($contract) {
            $contract->total_value = (float) $contract->contract_value + (float) ($contract->addendums_sum ?? 0);

            return $contract;
        });

        return response()->json($formattedContracts);
    }

    /**
     * Chi tiết hợp đồng nhà thầu phụ
     */
    public function show($id): JsonResponse
    {
        $contract = SubContract::with(['project', 'subcontractors', 'addendums', 'documents'])
            ->withSum(['addendums as addendums_sum' => function ($q) {
                $q->where('status', 'Có hiệu lực');
            }], 'value_adjustment')
            ->find($id);

        if (! $contract) {
            return response()->json(['message' => 'Không tìm thấy hợp đồng nhà thầu phụ'], 404);
        }

        $contract->total_value = (float) $contract->contract_value + (float) ($contract->addendums_sum ?? 0);

        return response()->json($contract);
    }

    /**
     * Lập hợp đồng nhà thầu phụ mới
     */
    public function store(Request $request): JsonResponse
    {
        // Tương thích ngược và hỗ trợ chọn nhiều: nếu truyền subcontractor_ids, chuyển thành mảng subcontractors
        if ($request->has('subcontractor_ids')) {
            $subcontractors = [];
            foreach ($request->subcontractor_ids as $subId) {
                $subcontractors[] = [
                    'subcontractor_id' => $subId,
                    'role_in_contract' => 'MEMBER',
                ];
            }
            if (count($subcontractors) > 0) {
                $subcontractors[0]['role_in_contract'] = 'MAIN';
            }
            $request->merge(['subcontractors' => $subcontractors]);
        } elseif ($request->filled('subcontractor_id')) {
            $request->merge([
                'subcontractors' => [
                    [
                        'subcontractor_id' => $request->subcontractor_id,
                        'role_in_contract' => 'MAIN',
                    ],
                ],
            ]);
        }

        $validator = Validator::make($request->all(), [
            'project_id' => 'required|exists:projects,id',
            'contract_name' => 'nullable|string|max:255',
            'contract_value' => 'required|numeric|min:0',
            'signed_date' => 'nullable|date',
            'document_file' => 'nullable|file|allowed_extensions:pdf,doc,docx,xls,xlsx,jpg,jpeg,png,zip|max:20480',
            'document_files' => 'nullable|array',
            'document_files.*' => 'required|file|allowed_extensions:pdf,doc,docx,xls,xlsx,jpg,jpeg,png,zip|max:20480',
            'file_url' => 'nullable|string',
            'subcontractors' => 'required|array|min:1',
            'subcontractors.*.subcontractor_id' => 'required|exists:subcontractors,id',
            'subcontractors.*.role_in_contract' => 'nullable|in:MAIN,MEMBER',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => $validator->errors()->first(), 'errors' => $validator->errors()], 422);
        }

        $project = \App\Models\Project::find($request->project_id);
        if ($project && $project->getRawOriginal('status') === 'Đã hoàn thành') {
            return response()->json(['message' => 'Dự án đã hoàn thành, không thể thêm hợp đồng thầu phụ mới.'], 400);
        }

        try {
            $contract = $this->subContractService->store(
                $request->all(),
                $request->file('document_files'),
                $request->file('document_file'),
                $request->input('file_url')
            );

            return response()->json([
                'message' => 'Lập hợp đồng nhà thầu phụ thành công',
                'data' => $contract->load(['project', 'subcontractors', 'documents']),
            ], 201);
        } catch (ValidationException $e) {
            return response()->json(['message' => $e->errors() ? collect($e->errors())->flatten()->first() : 'Dữ liệu không hợp lệ', 'errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Lỗi hệ thống khi tạo hợp đồng thầu phụ', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Cập nhật thông tin hợp đồng nhà thầu phụ
     */
    public function update(Request $request, $id): JsonResponse
    {
        $contract = SubContract::find($id);

        if (! $contract) {
            return response()->json(['message' => 'Không tìm thấy hợp đồng nhà thầu phụ'], 404);
        }

        if ($contract->project && $contract->project->getRawOriginal('status') === 'Đã hoàn thành') {
            return response()->json(['message' => 'Dự án đã hoàn thành, không thể chỉnh sửa hợp đồng thầu phụ.'], 400);
        }

        // Tương thích ngược và hỗ trợ chọn nhiều: nếu truyền subcontractor_ids, chuyển thành mảng subcontractors
        if ($request->has('subcontractor_ids')) {
            $subcontractors = [];
            foreach ($request->subcontractor_ids as $subId) {
                $subcontractors[] = [
                    'subcontractor_id' => $subId,
                    'role_in_contract' => 'MEMBER',
                ];
            }
            if (count($subcontractors) > 0) {
                $subcontractors[0]['role_in_contract'] = 'MAIN';
            }
            $request->merge(['subcontractors' => $subcontractors]);
        } elseif ($request->filled('subcontractor_id')) {
            $request->merge([
                'subcontractors' => [
                    [
                        'subcontractor_id' => $request->subcontractor_id,
                        'role_in_contract' => 'MAIN',
                    ],
                ],
            ]);
        }

        $validator = Validator::make($request->all(), [
            'contract_name' => 'nullable|string|max:255',
            'contract_value' => 'required|numeric|min:0',
            'signed_date' => 'nullable|date',
            'status' => 'required|in:DRAFT,ACTIVE,COMPLETED,TERMINATED',
            'subcontractors' => 'nullable|array|min:1',
            'subcontractors.*.subcontractor_id' => 'required_with:subcontractors|exists:subcontractors,id',
            'subcontractors.*.role_in_contract' => 'nullable|in:MAIN,MEMBER',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => $validator->errors()->first(), 'errors' => $validator->errors()], 422);
        }

        try {
            $contract = $this->subContractService->update($contract, $request->all());

            return response()->json([
                'message' => 'Cập nhật hợp đồng thầu phụ thành công',
                'data' => $contract->load('subcontractors'),
            ]);
        } catch (ValidationException $e) {
            return response()->json(['message' => $e->errors() ? collect($e->errors())->flatten()->first() : 'Dữ liệu không hợp lệ', 'errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Lỗi hệ thống khi cập nhật hợp đồng', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Xóa hợp đồng nhà thầu phụ
     */
    public function destroy($id): JsonResponse
    {
        $contract = SubContract::find($id);

        if (! $contract) {
            return response()->json(['message' => 'Không tìm thấy hợp đồng nhà thầu phụ'], 404);
        }

        try {
            $this->subContractService->destroy($contract);

            return response()->json(['message' => 'Xóa hợp đồng thầu phụ thành công']);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Lỗi hệ thống khi xóa hợp đồng', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Tải lên và liên kết tài liệu vào hợp đồng thầu phụ
     */
    public function uploadDocuments(Request $request, $id): JsonResponse
    {
        $contract = SubContract::find($id);
        if (! $contract) {
            return response()->json(['message' => 'Không tìm thấy hợp đồng nhà thầu phụ'], 404);
        }

        $validator = Validator::make($request->all(), [
            'document_files' => 'required|array|min:1',
            'document_files.*' => 'required|file|allowed_extensions:pdf,doc,docx,xls,xlsx,jpg,jpeg,png,zip|max:20480',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Tệp đính kèm không hợp lệ', 'errors' => $validator->errors()], 422);
        }

        try {
            $uploadedDocs = $this->subContractService->uploadDocuments($contract, $request->file('document_files'));

            return response()->json([
                'message' => 'Tải lên tài liệu thành công',
                'data' => $uploadedDocs,
            ], 200);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Lỗi hệ thống khi tải lên tài liệu', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Lấy danh sách công việc đã nghiệm thu đạt của hợp đồng thầu phụ này để giải ngân
     */
    public function getEligibleTasks($id): JsonResponse
    {
        $contract = SubContract::find($id);
        if (! $contract) {
            return response()->json(['message' => 'Không tìm thấy hợp đồng nhà thầu phụ'], 404);
        }

        if ($this->isTerminatedSubContract($contract)) {
            return response()->json(['message' => 'Hợp đồng thầu phụ đã bị hủy, không thể lập phiếu chi.'], 400);
        }

        // Tìm các TaskDetail thuộc hợp đồng này mà có tiến độ 100% (DONE) và đã duyệt nghiệm thu (APPROVED)
        $tasks = TaskDetail::whereIn('contractor_detail_id', function ($query) use ($id) {
            $query->select('id')
                ->from('detail_contract_contractor')
                ->where('sub_contract_id', $id);
        })
            ->where(function ($q) {
                $q->where('status', 'Đã hoàn thành')
                    ->orWhere('status', 'DONE');
            })
            ->where(function ($q) {
                $q->where('acceptance_status', 'Đã duyệt')
                    ->orWhere('acceptance_status', 'APPROVED');
            })
            ->with(['task', 'contractorDetail.subcontractor']) // eager load task and subcontractor info
            ->get();

        return response()->json($tasks);
    }
}
