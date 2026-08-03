<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\Pivot;

class DetailContractContractor extends Pivot
{
    use HasFactory;

    public $timestamps = false;

    protected $table = 'detail_contract_contractor';

    public $incrementing = true;

    protected $fillable = [
        'sub_contract_id',
        'subcontractor_id',
    ];

    protected $appends = ['role_in_contract'];

    public function getRoleInContractAttribute()
    {
        $subContractId = $this->sub_contract_id;
        if (! $subContractId) {
            return 'MAIN';
        }

        $first = self::where('sub_contract_id', $subContractId)
            ->orderBy('id', 'asc')
            ->first();

        if ($first && $first->id === $this->id) {
            return 'MAIN';
        }

        return 'MEMBER';
    }

    public function subContract()
    {
        return $this->belongsTo(SubContract::class, 'sub_contract_id');
    }

    public function subcontractor()
    {
        return $this->belongsTo(Subcontractor::class, 'subcontractor_id');
    }

    public function taskDetails()
    {
        return $this->hasMany(TaskDetail::class, 'contractor_detail_id');
    }
}
