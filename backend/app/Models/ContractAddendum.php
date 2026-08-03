<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ContractAddendum extends Model
{
    use HasFactory;

    const UPDATED_AT = null;

    protected $fillable = [
        'client_contract_id',
        'sub_contract_id',
        'addendum_code',
        'title',
        'value_adjustment',
        'signed_date',
        'status',
    ];

    protected static function booted()
    {
        static::saving(function ($model) {
            if (empty($model->signed_date)) {
                $model->signed_date = now()->toDateString();
            }
        });
    }

    public function clientContract()
    {
        return $this->belongsTo(ClientContract::class, 'client_contract_id');
    }

    public function subContract()
    {
        return $this->belongsTo(SubContract::class, 'sub_contract_id');
    }

    public function getStatusAttribute($value)
    {
        $map = [
            'Nháp' => 'DRAFT',
            'Chờ duyệt' => 'PENDING',
            'Có hiệu lực' => 'ACTIVE',
            'Hết hiệu lực' => 'REJECTED',
        ];

        return $map[$value] ?? $value;
    }

    public function setStatusAttribute($value)
    {
        $map = [
            'DRAFT' => 'Nháp',
            'PENDING' => 'Chờ duyệt',
            'ACTIVE' => 'Có hiệu lực',
            'REJECTED' => 'Hết hiệu lực',
        ];
        $this->attributes['status'] = $map[$value] ?? $value;
    }

    public function documents()
    {
        return $this->morphMany(ProjectDocument::class, 'documentable');
    }
}
