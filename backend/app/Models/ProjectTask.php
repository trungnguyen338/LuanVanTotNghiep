<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProjectTask extends Model
{
    use HasFactory;

    public $timestamps = false;

    const TYPE_CONSTRUCTION = 'Thi công trực tiếp';

    const TYPE_TECHNICAL = 'Hạng mục kỹ thuật / Thiết kế';

    protected static function booted()
    {
        static::saving(function ($model) {
            if (empty($model->task_type)) {
                $model->task_type = self::TYPE_CONSTRUCTION;
            }
            if ($model->status === 'CANCELLED' || $model->status === 'Đã hủy') {
                $model->progress_percent = -1;
                $model->attributes['status'] = 'Chưa thực hiện';
            } else {
                if (isset($model->attributes['progress_percent']) && (int) $model->attributes['progress_percent'] < 0) {
                    $model->progress_percent = 0;
                }
            }
        });
    }

    public static function getTypes(): array
    {
        return [
            ['value' => self::TYPE_CONSTRUCTION, 'label' => 'Thi công trực tiếp'],
            ['value' => self::TYPE_TECHNICAL, 'label' => 'Hạng mục kỹ thuật / Thiết kế'],
        ];
    }

    protected $fillable = [
        'project_id',
        'task_name',
        'task_type',
        'status',
        'billing_value',
        'progress_percent',
    ];

    protected $appends = ['details_total_value'];

    public function project()
    {
        return $this->belongsTo(Project::class, 'project_id');
    }

    public function details()
    {
        return $this->hasMany(TaskDetail::class, 'project_task_id');
    }

    public function getStatusAttribute($value)
    {
        if (isset($this->attributes['progress_percent']) && (int) $this->attributes['progress_percent'] < 0) {
            return 'CANCELLED';
        }
        $map = [
            'Chưa thực hiện' => 'TODO',
            'Đang thực hiện' => 'DOING',
            'Đã hoàn thành' => 'DONE',
        ];

        return $map[$value] ?? $value;
    }

    public function setStatusAttribute($value)
    {
        if ($value === 'CANCELLED' || $value === 'Đã hủy') {
            $this->attributes['progress_percent'] = -1;
            $this->attributes['status'] = 'Chưa thực hiện';

            return;
        }
        if (isset($this->attributes['progress_percent']) && (int) $this->attributes['progress_percent'] < 0) {
            $this->attributes['progress_percent'] = 0;
        }
        $map = [
            'TODO' => 'Chưa thực hiện',
            'DOING' => 'Đang thực hiện',
            'DONE' => 'Đã hoàn thành',
        ];
        $this->attributes['status'] = $map[$value] ?? $value;
    }

    public function getTaskTypeAttribute($value)
    {
        $map = [
            'CONSTRUCTION' => self::TYPE_CONSTRUCTION,
            'Thi công móng' => self::TYPE_CONSTRUCTION,
            'Khung kết cấu' => self::TYPE_CONSTRUCTION,
            'Hoàn thiện' => self::TYPE_CONSTRUCTION,
            'TECHNICAL' => self::TYPE_TECHNICAL,
            'Cơ điện ME' => self::TYPE_TECHNICAL,
        ];

        return $map[$value] ?? $value;
    }

    public function setTaskTypeAttribute($value)
    {
        $map = [
            'CONSTRUCTION' => self::TYPE_CONSTRUCTION,
            'Thi công móng' => self::TYPE_CONSTRUCTION,
            'Khung kết cấu' => self::TYPE_CONSTRUCTION,
            'Hoàn thiện' => self::TYPE_CONSTRUCTION,
            'TECHNICAL' => self::TYPE_TECHNICAL,
            'Cơ điện ME' => self::TYPE_TECHNICAL,
        ];
        $this->attributes['task_type'] = $map[$value] ?? $value;
    }

    public function getDetailsTotalValueAttribute()
    {
        if ($this->relationLoaded('details')) {
            return floatval($this->details
                ->sum('committed_value'));
        }

        return floatval($this->details()
            ->get()
            ->sum('committed_value'));
    }

    public function getEffectiveTaskValue(?float $billingValue = null, ?int $contractItemId = null): float
    {
        $value = $billingValue ?? floatval($this->billing_value ?? 0);
        return floatval(max(0, $value));
    }

    public static function recalculateProgress($parentTaskId): void
    {
        $parentTask = self::find($parentTaskId);
        if (!$parentTask) {
            return;
        }

        if (isset($parentTask->progress_percent) && (int) $parentTask->progress_percent < 0) {
            return;
        }

        $details = TaskDetail::where('project_task_id', $parentTaskId)->get();
        if ($details->isEmpty()) {
            $parentTask->progress_percent = 0;
            $parentTask->status = 'TODO';
            $parentTask->save();

            return;
        }

        $reassignedSourceNames = $details
            ->filter(function ($detail) {
                return str_ends_with(trim((string) $detail->detail_name), ' - Phần còn lại');
            })
            ->map(function ($detail) {
                return substr(trim((string) $detail->detail_name), 0, -strlen(' - Phần còn lại'));
            })
            ->filter()
            ->values();

        $validDetails = $details->filter(function ($detail) use ($reassignedSourceNames) {
            return self::getDetailProgressScopeValue($detail, $reassignedSourceNames) > 0;
        });

        if ($validDetails->isEmpty()) {
            $progress = 0;
        } else {
            $totalVal = $validDetails->sum(function ($detail) use ($reassignedSourceNames) {
                return self::getDetailProgressScopeValue($detail, $reassignedSourceNames);
            });
            if ($totalVal > 0) {
                $completedValue = $validDetails->sum(function ($detail) {
                    return self::getDetailCompletedValue($detail);
                });
                $progress = round(($completedValue / $totalVal) * 100);
            } else {
                $progress = round($validDetails->avg('progress_percent'));
            }
        }

        $parentTask->progress_percent = min(100, max(0, (int) $progress));

        $activeDetails = $details->filter(function ($detail) {
            return $detail->status !== 'CANCELLED';
        });

        $allApprovedAndDone = $activeDetails->isNotEmpty() && $activeDetails->every(function ($detail) {
            return $detail->status === 'DONE' && $detail->acceptance_status === 'APPROVED';
        });

        if ($allApprovedAndDone && $parentTask->progress_percent == 100) {
            $parentTask->status = 'DONE';
        } elseif ($parentTask->progress_percent > 0) {
            $parentTask->status = 'DOING';
        } else {
            $parentTask->status = 'TODO';
        }

        $parentTask->save();

        if ($parentTask->project) {
            $parentTask->project->checkAutoCompletion();
        }
    }

    protected static function getDetailProgressScopeValue(TaskDetail $detail, $reassignedSourceNames): float
    {
        $totalValue = floatval($detail->total_value);
        if ($totalValue <= 0) {
            return 0.0;
        }

        if ($detail->status !== 'CANCELLED') {
            return $totalValue;
        }

        $detailName = trim((string) $detail->detail_name);
        if ($reassignedSourceNames->contains($detailName)) {
            return floatval($detail->committed_value);
        }

        return $totalValue;
    }

    protected static function getDetailCompletedValue(TaskDetail $detail): float
    {
        if ($detail->status === 'CANCELLED') {
            return floatval($detail->committed_value);
        }

        return floatval($detail->total_value) * min(100, max(0, floatval($detail->progress_percent))) / 100;
    }
}
