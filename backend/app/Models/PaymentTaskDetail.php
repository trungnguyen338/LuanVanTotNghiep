<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PaymentTaskDetail extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $table = 'payment_task_details';

    protected $fillable = [
        'payment_id',
        'task_detail_id',
        'allocated_amount',
    ];

    public function payment()
    {
        return $this->belongsTo(ProjectPayment::class, 'payment_id');
    }

    public function taskDetail()
    {
        return $this->belongsTo(TaskDetail::class, 'task_detail_id');
    }
}
