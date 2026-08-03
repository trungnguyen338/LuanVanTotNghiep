<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ClientContract extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'project_id',
        'contract_code',
        'contract_name',
        'total_value',
        'contract_value',
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

    protected $appends = ['contract_value', 'original_value', 'addition_value', 'reduction_value', 'actual_value', 'received_amount', 'remaining_amount'];

    public function getContractValueAttribute()
    {
        return floatval($this->getRawOriginal('total_value') ?? $this->attributes['total_value'] ?? 0.0);
    }

    public function setContractValueAttribute($value)
    {
        $this->attributes['total_value'] = $value;
    }

    public function getOriginalValueAttribute()
    {
        return floatval($this->getRawOriginal('total_value') ?? $this->attributes['total_value'] ?? 0.0);
    }

    public function getAdditionValueAttribute()
    {
        return floatval($this->addendums()->where('status', 'Có hiệu lực')->where('value_adjustment', '>', 0)->sum('value_adjustment'));
    }

    public function getReductionValueAttribute()
    {
        return floatval($this->items()->where('status', 'cancelled')->get()->sum(function ($item) {
            return floatval($item->unit_price);
        }));
    }

    public function getActualValueAttribute()
    {
        return $this->original_value + $this->addition_value - $this->reduction_value;
    }

    public function getReceivedAmountAttribute()
    {
        return floatval($this->payments()->where('payment_type', 'THU')->where('status', 'Đã giải ngân')->sum('amount'));
    }

    public function getRemainingAmountAttribute()
    {
        return floatval($this->actual_value - $this->received_amount);
    }

    public function syncCompletionStatus(float $tolerance = 10.0): bool
    {
        $this->refresh();

        if (in_array($this->status, ['COMPLETED', 'TERMINATED'])) {
            $this->syncDocumentStatuses();

            return false;
        }

        if ($this->remaining_amount <= $tolerance) {
            $this->status = 'COMPLETED';
            $this->save();
            $this->syncDocumentStatuses();

            return true;
        }

        $this->syncDocumentStatuses();

        return false;
    }

    public function project()
    {
        return $this->belongsTo(Project::class, 'project_id');
    }

    public function items()
    {
        return $this->hasMany(ContractItem::class, 'contract_id');
    }

    public function addendums()
    {
        return $this->hasMany(ContractAddendum::class, 'client_contract_id');
    }

    public function documents()
    {
        return $this->morphMany(ProjectDocument::class, 'documentable');
    }

    public function getDocumentStatusAttribute(): string
    {
        return in_array($this->status, ['COMPLETED', 'TERMINATED'], true) ? 'ARCHIVED' : 'ACTIVE';
    }

    public function syncDocumentStatuses(): int
    {
        return $this->documents()->update(['status' => $this->document_status]);
    }

    public function getStatusAttribute($value)
    {
        $map = [
            'Nháp' => 'DRAFT',
            'Có hiệu lực' => 'ACTIVE',
            'Đã thanh lý' => 'COMPLETED',
            'Bị hủy' => 'TERMINATED',
        ];

        return $map[$value] ?? $value;
    }

    public function setStatusAttribute($value)
    {
        $map = [
            'DRAFT' => 'Nháp',
            'ACTIVE' => 'Có hiệu lực',
            'COMPLETED' => 'Đã thanh lý',
            'TERMINATED' => 'Bị hủy',
        ];
        $this->attributes['status'] = $map[$value] ?? $value;
    }

    public function payments()
    {
        return $this->hasMany(ProjectPayment::class, 'client_contract_id');
    }
}
