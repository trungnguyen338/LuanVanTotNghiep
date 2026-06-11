<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Project extends Model
{
    use HasFactory;

    const UPDATED_AT = null;

    protected $fillable = [
        'project_code',
        'category_id',
        'name',
        'customer_id',
        'supervisor_id',
        'address',
        'start_date',
        'expected_end_date',
        'status',
    ];

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

    public function tasks()
    {
        return $this->hasMany(ProjectTask::class, 'project_id');
    }
}
