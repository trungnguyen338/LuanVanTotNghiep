<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class TaskDetail extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $table = 'task_details';

    protected $appends = [
        'total_value',
        'committed_value',
        'remaining_work_volume',
        'remaining_work_value',
        'effective_progress_percent',
        'accumulated_volume',
        'paid_amount',
        'remaining_amount',
    ];

    protected $fillable = [
        'project_task_id',
        'contractor_detail_id',
        'detail_name',
        'unit',
        'work_volume',
        'agreed_price',
        'progress_percent',
        'status',
        'acceptance_status',
        'rejection_note',
        'start_date',
        'end_date',
    ];

    protected static function booted()
    {
        static::saving(function ($model) {
            if (empty($model->start_date)) {
                $model->start_date = now()->toDateString();
            }
            if (empty($model->end_date)) {
                $model->end_date = now()->addMonth()->toDateString();
            }

            // Lấy trạng thái đã qua accessor để đồng bộ thống nhất
            $status = $model->status;

            if ($status === 'CANCELLED') {
                $model->attributes['status'] = 'Đã hủy';
                if (! isset($model->attributes['progress_percent'])) {
                    $model->progress_percent = 0;
                }
            } else {
                // Đảm bảo progress_percent nằm trong khoảng hợp lệ [0, 100]
                if ($model->progress_percent < 0) {
                    $model->progress_percent = 0;
                }
                if ($model->progress_percent > 100) {
                    $model->progress_percent = 100;
                }

                // Tự động reset trạng thái nghiệm thu nếu tiến độ < 100%
                if ($model->progress_percent < 100) {
                    if (in_array($model->acceptance_status, ['PENDING', 'APPROVED'])) {
                        $model->acceptance_status = 'NONE';
                    }
                }

                // Nếu đã được duyệt nghiệm thu (APPROVED), tiến độ phải là 100% và trạng thái phải là DONE
                if ($model->acceptance_status === 'APPROVED') {
                    $model->progress_percent = 100;
                    $model->status = 'DONE';
                } else {
                    // Đồng bộ trạng thái theo tiến độ
                    if ($model->progress_percent >= 100) {
                        $model->status = 'DONE';
                    } elseif ($model->progress_percent > 0) {
                        // Nếu tiến độ > 0, chuyển sang DOING (Đang thực hiện) trừ khi đang là Tạm dừng (ON_HOLD)
                        if ($status === 'TODO' || $status === 'DONE' || empty($status)) {
                            $model->status = 'DOING';
                        }
                    } else {
                        // Nếu tiến độ = 0, chuyển sang TODO (Chưa thực hiện) trừ khi đang là Tạm dừng (ON_HOLD)
                        if ($status === 'DOING' || $status === 'DONE' || empty($status)) {
                            $model->status = 'TODO';
                        }
                    }
                }
            }
        });
    }

    public function getAcceptanceStatusAttribute($value)
    {
        $map = [
            'Chưa nghiệm thu' => 'NONE',
            'Chờ nghiệm thu' => 'PENDING',
            'Đã duyệt' => 'APPROVED',
            'Bị từ chối' => 'REJECTED',
        ];

        return $map[$value] ?? 'NONE';
    }

    public function setAcceptanceStatusAttribute($value)
    {
        $map = [
            'NONE' => 'Chưa nghiệm thu',
            'PENDING' => 'Chờ nghiệm thu',
            'APPROVED' => 'Đã duyệt',
            'REJECTED' => 'Bị từ chối',
        ];
        $this->attributes['acceptance_status'] = $map[$value] ?? $value;
    }

    public function getStatusAttribute($value)
    {
        if ($value === 'Đã hủy') {
            return 'CANCELLED';
        }
        if (isset($this->attributes['progress_percent']) && (int) $this->attributes['progress_percent'] < 0) {
            return 'CANCELLED';
        }
        $map = [
            'Chưa thực hiện' => 'TODO',
            'Đang thực hiện' => 'DOING',
            'Đã hoàn thành' => 'DONE',
            'Tạm dừng' => 'ON_HOLD',
        ];

        return $map[$value] ?? 'TODO';
    }

    public function setStatusAttribute($value)
    {
        if ($value === 'CANCELLED' || $value === 'Đã hủy') {
            $this->attributes['status'] = 'Đã hủy';

            return;
        }
        $map = [
            'TODO' => 'Chưa thực hiện',
            'DOING' => 'Đang thực hiện',
            'DONE' => 'Đã hoàn thành',
            'ON_HOLD' => 'Tạm dừng',
            'Tạm dừng' => 'Tạm dừng',
        ];
        $this->attributes['status'] = $map[$value] ?? $value;
    }

    public function task()
    {
        return $this->belongsTo(ProjectTask::class, 'project_task_id');
    }

    public function contractorDetail()
    {
        return $this->belongsTo(DetailContractContractor::class, 'contractor_detail_id');
    }

    public function logs()
    {
        return $this->hasMany(ConstructionLog::class, 'task_detail_id');
    }

    public function paymentTaskDetails()
    {
        return $this->hasMany(PaymentTaskDetail::class, 'task_detail_id');
    }

    public function getPaidAmountAttribute()
    {
        return floatval(DB::table('payment_task_details')
            ->join('project_payment', 'payment_task_details.payment_id', '=', 'project_payment.id')
            ->where('payment_task_details.task_detail_id', $this->id)
            ->where('project_payment.status', 'Đã giải ngân')
            ->sum('payment_task_details.allocated_amount'));
    }

    public function getTotalValueAttribute()
    {
        return floatval($this->work_volume) * floatval($this->agreed_price);
    }

    public function getCommittedValueAttribute()
    {
        if (! $this->isCancelledRecord()) {
            return $this->total_value;
        }

        $progress = floatval($this->progress_percent);
        if ($progress <= 0) {
            return 0.0;
        }

        return floatval($this->total_value * min(100, $progress) / 100);
    }

    public function getRemainingWorkVolumeAttribute()
    {
        if (! $this->isCancelledRecord()) {
            return 0.0;
        }

        $progress = floatval($this->progress_percent);
        if ($progress <= 0) {
            return floatval($this->work_volume);
        }

        return floatval($this->work_volume * max(0, 100 - min(100, $progress)) / 100);
    }

    public function getRemainingWorkValueAttribute()
    {
        if (! $this->isCancelledRecord()) {
            return 0.0;
        }

        return floatval($this->total_value - $this->committed_value);
    }

    public function getEffectiveProgressPercentAttribute()
    {
        if (! $this->isCancelledRecord()) {
            return floatval($this->progress_percent);
        }

        if ($this->committed_value > 0) {
            return 100.0;
        }

        return max(0.0, floatval($this->progress_percent));
    }

    public function getAccumulatedVolumeAttribute()
    {
        $loggedVolume = floatval($this->logs()->sum('daily_volume'));
        $progressVolume = (floatval($this->progress_percent) / 100) * floatval($this->work_volume);

        return max($loggedVolume, $progressVolume);
    }

    public function getRemainingAmountAttribute()
    {
        return max(0.0, floatval($this->committed_value - $this->paid_amount));
    }

    protected function isCancelledRecord(): bool
    {
        return $this->getRawOriginal('status') === 'Đã hủy'
            || (isset($this->attributes['progress_percent']) && (int) $this->attributes['progress_percent'] < 0)
            || $this->status === 'CANCELLED';
    }
}
