<?php

namespace App\Http\Controllers;

use App\Models\ClientContract;
use App\Models\Customer;
use App\Models\Project;
use App\Models\ProjectPayment;
use App\Models\SubContract;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class ProjectController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Project::with([
            'category',
            'customer',
            'tasks.details',
            'clientContracts',
            'subContracts' => function ($q) {
                $q->withSum(['addendums as active_addendums_sum' => function ($sq) {
                    $sq->where('status', 'Có hiệu lực');
                }], 'value_adjustment');
            }
        ])
            ->withSum('clientContracts', 'total_value')
            ->withSum(['clientContractAddendums as client_contract_addendums_sum' => function ($q) {
                $q->where('contract_addendums.status', 'Có hiệu lực');
            }], 'value_adjustment')
            ->withSum(['clientContractItems as client_contract_items_reduction_sum' => function ($q) {
                $q->where('contract_items.status', 'cancelled');
            }], 'unit_price');

        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'LIKE', "%{$search}%")
                    ->orWhere('project_code', 'LIKE', "%{$search}%");
            });
        }

        $projects = $query->orderBy('id', 'desc')->get();

        // Tối ưu hóa truy vấn Doanh thu lũy kế gom nhóm theo hợp đồng để tránh N+1
        $projectContractIds = ClientContract::whereIn('project_id', $projects->pluck('id'))->pluck('id');
        $paymentsGrouped = ProjectPayment::where('payment_type', 'THU')
            ->where('status', 'Đã giải ngân')
            ->whereIn('client_contract_id', $projectContractIds)
            ->select('client_contract_id', DB::raw('SUM(amount) as total'))
            ->groupBy('client_contract_id')
            ->pluck('total', 'client_contract_id');

        // Xử lý lại kết quả trả về để đổi tên biến cho frontend dễ dùng
        $formattedProjects = $projects->map(function ($project) use ($paymentsGrouped) {
            $project->budget = ($project->client_contracts_sum_total_value ?? 0)
                + ($project->client_contract_addendums_sum ?? 0)
                - ($project->client_contract_items_reduction_sum ?? 0);
            $project->progress = $this->calculateProjectProgress($project);
            $project->received_budget = floatval($project->clientContracts->sum(function ($c) use ($paymentsGrouped) {
                return floatval($paymentsGrouped[$c->id] ?? 0.0);
            }));
            $project->spent_budget = floatval($project->subContracts->sum(function ($c) {
                return floatval($c->original_value) + floatval($c->active_addendums_sum ?? 0.0);
            }));

            return $project;
        });

        return response()->json($formattedProjects);
    }

    public function show($id): JsonResponse
    {
        $project = Project::with([
            'category',
            'customer',
            'tasks.details',
            'documents.documentType',
        ])
            ->withSum('clientContracts', 'total_value')
            ->withSum(['clientContractAddendums as client_contract_addendums_sum' => function ($q) {
                $q->where('contract_addendums.status', 'Có hiệu lực');
            }], 'value_adjustment')
            ->withSum(['clientContractItems as client_contract_items_reduction_sum' => function ($q) {
                $q->where('contract_items.status', 'cancelled');
            }], 'unit_price')
            ->find($id);

        if (! $project) {
            return response()->json(['message' => 'Không tìm thấy dự án'], 404);
        }

        $project->budget = ($project->client_contracts_sum_total_value ?? 0)
            + ($project->client_contract_addendums_sum ?? 0)
            - ($project->client_contract_items_reduction_sum ?? 0);
        $project->received_budget = floatval(ProjectPayment::where('payment_type', 'THU')
            ->where('status', 'Đã giải ngân')
            ->whereIn('client_contract_id', function ($q) use ($id) {
                $q->select('id')->from('client_contracts')->where('project_id', $id);
            })
            ->sum('amount'));
        $project->spent_budget = floatval(SubContract::where('project_id', $id)
            ->withSum(['addendums as active_addendums_sum' => function ($q) {
                $q->where('status', 'Có hiệu lực');
            }], 'value_adjustment')
            ->get()
            ->sum(function ($c) {
                return floatval($c->original_value) + floatval($c->active_addendums_sum ?? 0.0);
            }));
        $project->progress = $this->calculateProjectProgress($project);

        return response()->json($project);
    }

    private function calculateProjectProgress($project): int
    {
        $tasks = $project->tasks;
        if ($tasks->isEmpty()) {
            return 0;
        }

        $totalValue = 0;
        $weightedProgressSum = 0;

        foreach ($tasks as $task) {
            $value = floatval($task->billing_value);
            $totalValue += $value;
            $weightedProgressSum += floatval($task->progress_percent) * $value;
        }

        if ($totalValue > 0) {
            $progress = round($weightedProgressSum / $totalValue);
        } else {
            $progress = round($tasks->avg('progress_percent'));
        }

        return min(100, max(0, (int) $progress));
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'category_id' => 'required|exists:project_categories,id',
            'customer_id' => 'required|exists:customers,id',
            'address' => 'required|string',
            'start_date' => 'nullable|date',
            'expected_end_date' => 'nullable|date|after_or_equal:start_date',
            'status' => 'required|in:DRAFT,PENDING,PROCESSING,REVISION,COMPLETED,ON_HOLD',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => $validator->errors()->first(), 'errors' => $validator->errors()], 422);
        }

        // Sinh mã dự án (PRO-xxxx)
        $lastProject = Project::orderBy('id', 'desc')->first();
        $nextId = $lastProject ? $lastProject->id + 1 : 1;
        $projectCode = 'PRO-'.str_pad($nextId, 4, '0', STR_PAD_LEFT);

        $project = new Project;
        $project->project_code = $projectCode;
        $project->name = $request->name;
        $project->category_id = $request->category_id;
        $project->customer_id = $request->customer_id;
        $project->address = $request->address;
        $project->start_date = $request->start_date;
        $project->expected_end_date = $request->expected_end_date;
        $project->status = $request->status;
        $project->save();

        app(\App\Services\ProjectCustomerNotificationService::class)->notify(
            $project,
            'Dự án mới đã được khởi tạo',
            'Dự án "'.$project->name.'" (mã '.$project->project_code.') vừa được tạo trên hệ thống. Bạn có thể theo dõi tiến độ và tài liệu liên quan trong cổng khách hàng.',
            'PROJECT_CREATED',
            $project->id
        );

        return response()->json(['message' => 'Thêm dự án thành công', 'data' => $project], 201);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $project = Project::find($id);

        if (! $project) {
            return response()->json(['message' => 'Không tìm thấy dự án'], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'category_id' => 'required|exists:project_categories,id',
            'customer_id' => 'required|exists:customers,id',
            'address' => 'required|string',
            'start_date' => 'nullable|date',
            'expected_end_date' => 'nullable|date|after_or_equal:start_date',
            'status' => 'required|in:DRAFT,PENDING,PROCESSING,REVISION,COMPLETED,ON_HOLD',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => $validator->errors()->first(), 'errors' => $validator->errors()], 422);
        }

        $project->name = $request->name;
        $project->category_id = $request->category_id;
        $project->customer_id = $request->customer_id;
        $project->address = $request->address;
        $project->start_date = $request->start_date;
        $project->expected_end_date = $request->expected_end_date;
        $project->status = $request->status;
        $project->save();

        app(\App\Services\ProjectCustomerNotificationService::class)->notify(
            $project,
            'Dự án đã được cập nhật',
            'Dự án "'.$project->name.'" (mã '.$project->project_code.') vừa được cập nhật thông tin trên hệ thống.',
            'PROJECT_UPDATED',
            $project->id
        );

        return response()->json(['message' => 'Cập nhật dự án thành công', 'data' => $project]);
    }

    public function destroy($id): JsonResponse
    {
        $project = Project::find($id);

        if (! $project) {
            return response()->json(['message' => 'Không tìm thấy dự án'], 404);
        }

        $project->status = 'ON_HOLD'; // Tạm ngưng
        $project->save();

        app(\App\Services\ProjectCustomerNotificationService::class)->notify(
            $project,
            'Dự án đã tạm dừng',
            'Dự án "'.$project->name.'" (mã '.$project->project_code.') đã được chuyển sang trạng thái Tạm dừng.',
            'PROJECT_ON_HOLD',
            $project->id
        );

        return response()->json(['message' => 'Đã chuyển dự án sang trạng thái Tạm ngưng']);
    }

    public function customerProjects(Request $request): JsonResponse
    {
        $user = $request->user();
        $customer = Customer::where('user_id', $user->id)->first();
 
        if (! $customer) {
            return response()->json([], 200);
        }
 
        $query = Project::with([
            'category',
            'customer',
            'tasks.details.logs.images',
            'clientContracts',
            'subContracts' => function ($q) {
                $q->withSum(['addendums as active_addendums_sum' => function ($sq) {
                    $sq->where('status', 'Có hiệu lực');
                }], 'value_adjustment');
            },
            'documents' => function ($q) {
                $q->where(function ($sub) {
                    $sub->whereNull('documentable_type')
                        ->orWhere('documentable_type', 'App\Models\ClientContract')
                        ->orWhere(function ($addendumQuery) {
                            $addendumQuery->where('documentable_type', 'App\Models\ContractAddendum')
                                ->whereIn('documentable_id', function ($subQuery) {
                                    $subQuery->select('id')
                                         ->from('contract_addendums')
                                         ->whereNotNull('client_contract_id');
                                });
                        });
                })->with('documentType');
            },
        ])
            ->where('customer_id', $customer->id)
            ->withSum('clientContracts', 'total_value')
            ->withSum(['clientContractAddendums as client_contract_addendums_sum' => function ($q) {
                $q->where('contract_addendums.status', 'Có hiệu lực');
            }], 'value_adjustment')
            ->withSum(['clientContractItems as client_contract_items_reduction_sum' => function ($q) {
                $q->where('contract_items.status', 'cancelled');
            }], 'unit_price');
 
        $projects = $query->orderBy('id', 'desc')->get();
 
        $projectContractIds = ClientContract::whereIn('project_id', $projects->pluck('id'))->pluck('id');
        $paymentsGrouped = ProjectPayment::where('payment_type', 'THU')
            ->where('status', 'Đã giải ngân')
            ->whereIn('client_contract_id', $projectContractIds)
            ->select('client_contract_id', DB::raw('SUM(amount) as total'))
            ->groupBy('client_contract_id')
            ->pluck('total', 'client_contract_id');
 
        $formattedProjects = $projects->map(function ($project) use ($paymentsGrouped) {
            $project->budget = ($project->client_contracts_sum_total_value ?? 0)
                + ($project->client_contract_addendums_sum ?? 0)
                - ($project->client_contract_items_reduction_sum ?? 0);
            $project->progress = $this->calculateProjectProgress($project);
            $project->received_budget = floatval($project->clientContracts->sum(function ($c) use ($paymentsGrouped) {
                return floatval($paymentsGrouped[$c->id] ?? 0.0);
            }));
            $project->spent_budget = floatval($project->subContracts->sum(function ($c) {
                return floatval($c->original_value) + floatval($c->active_addendums_sum ?? 0.0);
            }));
 
            return $project;
        });
 
        return response()->json($formattedProjects);
    }
}
