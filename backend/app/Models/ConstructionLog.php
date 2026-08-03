<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ConstructionLog extends Model
{
    use HasFactory;

    const UPDATED_AT = null;

    protected $table = 'construction_logs';

    protected $fillable = [
        'task_detail_id',
        'daily_volume',
        'title',
        'description',
        'weather',
        'created_at',
    ];

    protected static function booted()
    {
        static::saving(function ($model) {
            if (empty($model->title)) {
                $model->title = 'Nhật ký thi công';
            }
            if (empty($model->description)) {
                $model->description = 'Không có mô tả';
            }
            if (empty($model->weather)) {
                $model->weather = 'Bình thường';
            }
        });
    }

    protected $casts = [
        'daily_volume' => 'decimal:2',
    ];

    public function taskDetail()
    {
        return $this->belongsTo(TaskDetail::class, 'task_detail_id');
    }

    public function images()
    {
        return $this->hasMany(ConstructionLogImage::class, 'log_id');
    }
}
