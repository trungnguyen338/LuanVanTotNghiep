<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProjectPayment extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $table = 'project_payment';

    protected $fillable = [
        'payment_code',
        'payment_type',
        'client_contract_id',
        'sub_contract_id',
        'title',
        'amount',
        'payment_date',
        'status',
    ];

    protected static function booted()
    {
        static::saving(function ($model) {
            if (empty($model->payment_date)) {
                $model->payment_date = now()->toDateString();
            }
            if (empty($model->payment_code)) {
                $model->payment_code = 'PAY-'.strtoupper(uniqid());
            }
        });
    }

    public function getStatusAttribute($value)
    {
        $map = [
            'Chờ duyệt' => 'PENDING',
            'Đã giải ngân' => 'COMPLETED',
        ];

        return $map[$value] ?? $value;
    }

    public function setStatusAttribute($value)
    {
        $map = [
            'PENDING' => 'Chờ duyệt',
            'COMPLETED' => 'Đã giải ngân',
        ];
        $this->attributes['status'] = $map[$value] ?? $value;
    }

    public function getPaymentTypeAttribute($value)
    {
        $map = [
            'THU' => 'REVENUE',
            'CHI' => 'COST',
        ];

        return $map[$value] ?? $value;
    }

    public function setPaymentTypeAttribute($value)
    {
        $map = [
            'REVENUE' => 'THU',
            'COST' => 'CHI',
        ];
        $this->attributes['payment_type'] = $map[$value] ?? $value;
    }

    public function clientContract()
    {
        return $this->belongsTo(ClientContract::class, 'client_contract_id');
    }

    public function subContract()
    {
        return $this->belongsTo(SubContract::class, 'sub_contract_id');
    }

    public function paymentTaskDetails()
    {
        return $this->hasMany(PaymentTaskDetail::class, 'payment_id');
    }
}
