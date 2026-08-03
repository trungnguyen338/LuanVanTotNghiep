<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ContractItem extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'contract_id',
        'item_name',
        'volume',
        'unit_price',
        'status',
    ];

    protected $appends = ['price', 'description'];

    public function getPriceAttribute()
    {
        return floatval($this->unit_price ?? 0);
    }

    public function getDescriptionAttribute()
    {
        return '';
    }

    public function clientContract()
    {
        return $this->belongsTo(ClientContract::class, 'contract_id');
    }
}
