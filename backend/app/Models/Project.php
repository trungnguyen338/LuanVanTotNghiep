<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Project extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'project_code',
        'category_id',
        'name',
        'customer_id',
        'address',
        'start_date',
        'expected_end_date',
        'status',
    ];

    protected $appends = ['received_budget', 'spent_budget'];

    protected static function booted()
    {
        static::saving(function ($model) {
            if (empty($model->start_date)) {
                $model->start_date = now()->toDateString();
            }
            if (empty($model->expected_end_date)) {
                $model->expected_end_date = now()->addYear()->toDateString();
            }
        });
    }

    public function getReceivedBudgetAttribute()
    {
        return floatval(ProjectPayment::where('payment_type', 'THU')
            ->where('status', 'Đã giải ngân')
            ->whereIn('client_contract_id', $this->clientContracts()->pluck('id'))
            ->sum('amount'));
    }

    public function getSpentBudgetAttribute()
    {
        return floatval(SubContract::where('project_id', $this->id)
            ->withSum(['addendums as active_addendums_sum' => function ($q) {
                $q->where('status', 'Có hiệu lực');
            }], 'value_adjustment')
            ->get()
            ->sum(function ($c) {
                return floatval($c->original_value) + floatval($c->active_addendums_sum ?? 0.0);
            }));
    }

    public function category()
    {
        return $this->belongsTo(ProjectCategory::class, 'category_id');
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class, 'customer_id');
    }

    public function clientContracts()
    {
        return $this->hasMany(ClientContract::class, 'project_id');
    }

    public function subContracts()
    {
        return $this->hasMany(SubContract::class, 'project_id');
    }

    public function clientContractAddendums()
    {
        return $this->hasManyThrough(ContractAddendum::class, ClientContract::class, 'project_id', 'client_contract_id');
    }

    public function clientContractItems()
    {
        return $this->hasManyThrough(ContractItem::class, ClientContract::class, 'project_id', 'contract_id');
    }

    public function tasks()
    {
        return $this->hasMany(ProjectTask::class, 'project_id');
    }

    public function getStatusAttribute($value)
    {
        $map = [
            'Mới khởi tạo' => 'PENDING',
            'Đang triển khai' => 'PROCESSING',
            'Tạm dừng' => 'ON_HOLD',
            'Đã hoàn thành' => 'COMPLETED',
        ];

        return $map[$value] ?? $value;
    }

    public function setStatusAttribute($value)
    {
        $map = [
            'DRAFT' => 'Mới khởi tạo',
            'PENDING' => 'Mới khởi tạo',
            'PROCESSING' => 'Đang triển khai',
            'REVISION' => 'Đang triển khai',
            'ON_HOLD' => 'Tạm dừng',
            'COMPLETED' => 'Đã hoàn thành',
        ];

        $this->attributes['status'] = $map[$value] ?? $value;
    }

    public function checkAutoCompletion(): bool
    {
        // Calculate project progress
        $tasks = $this->tasks;
        if ($tasks->isEmpty()) {
            $progress = 0;
        } else {
            $progress = round($tasks->avg('progress_percent'));
            $progress = min(100, max(0, (int) $progress));
        }

        if ($progress < 100) {
            return false;
        }

        // Calculate budget and received budget using direct SQL queries
        $clientContractIds = \DB::table('client_contracts')->where('project_id', $this->id)->pluck('id');
        $totalValue = floatval(\DB::table('client_contracts')->where('project_id', $this->id)->sum('total_value'));
        $addendumsSum = floatval(\DB::table('contract_addendums')->whereIn('client_contract_id', $clientContractIds)->where('status', 'Có hiệu lực')->sum('value_adjustment'));
        $reductionSum = floatval(\DB::table('contract_items')->whereIn('contract_id', $clientContractIds)->where('status', 'cancelled')->sum('unit_price'));

        $budget = $totalValue + $addendumsSum - $reductionSum;

        $receivedBudget = floatval(\App\Models\ProjectPayment::where('payment_type', 'THU')
            ->where('status', 'Đã giải ngân')
            ->whereIn('client_contract_id', $clientContractIds)
            ->sum('amount'));

        // Calculate subcontracts value and subcontractor payments
        $subContractIds = \DB::table('sub_contracts')->where('project_id', $this->id)->pluck('id');
        $subContractsValue = 0.0;
        $subContractsPaid = 0.0;

        if ($subContractIds->isNotEmpty()) {
            $subOriginal = floatval(\DB::table('sub_contracts')->whereIn('id', $subContractIds)->sum('total_value'));
            $subAddition = floatval(\DB::table('contract_addendums')->whereIn('sub_contract_id', $subContractIds)->where('status', 'Có hiệu lực')->where('value_adjustment', '>', 0)->sum('value_adjustment'));
            $subReduction = floatval(TaskDetail::whereIn('contractor_detail_id', function ($query) use ($subContractIds) {
                $query->select('id')
                    ->from('detail_contract_contractor')
                    ->whereIn('sub_contract_id', $subContractIds);
            })->where('progress_percent', '<', 0)->get()->sum(function ($detail) {
                return floatval($detail->work_volume) * floatval($detail->agreed_price);
            }));

            $subContractsValue = $subOriginal + $subAddition - $subReduction;

            $subContractsPaid = floatval(\App\Models\ProjectPayment::where('payment_type', 'CHI')
                ->where('status', 'Đã giải ngân')
                ->whereIn('sub_contract_id', $subContractIds)
                ->sum('amount'));
        }

        // If progress is 100%, and client payments are fully received, and subcontractor payments are fully paid, auto-complete
        $clientPaidSatisfied = ($receivedBudget >= ($budget - 10.0));
        $subContractPaidSatisfied = ($subContractsPaid >= ($subContractsValue - 10.0));

        if ($clientPaidSatisfied && $subContractPaidSatisfied) {
            $originalStatus = $this->getRawOriginal('status');
            if ($originalStatus !== 'Đã hoàn thành') {
                $this->status = 'COMPLETED'; // sets status to 'Đã hoàn thành' via mutator
                $this->save();
                return true;
            }
        }

        return false;
    }

    public function documents()
    {
        return $this->hasMany(ProjectDocument::class, 'project_id');
    }
}
