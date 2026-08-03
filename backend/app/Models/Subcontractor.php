<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Subcontractor extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'subcontractor_code',
        'status',
        'user_id',
    ];

    protected $with = ['user'];

    protected $appends = ['name', 'phone', 'email', 'address'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function getNameAttribute()
    {
        return $this->user ? $this->user->full_name : null;
    }

    public function getPhoneAttribute()
    {
        return $this->user ? $this->user->phone : null;
    }

    public function getEmailAttribute()
    {
        return $this->user ? $this->user->email : null;
    }

    public function getAddressAttribute()
    {
        return $this->user ? $this->user->address : null;
    }

    public function contractLinks()
    {
        return $this->hasMany(DetailContractContractor::class, 'subcontractor_id');
    }
}
