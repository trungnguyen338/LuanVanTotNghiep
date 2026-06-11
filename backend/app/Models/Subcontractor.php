<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Subcontractor extends Model
{
    use HasFactory;

    const UPDATED_AT = null;

    protected $fillable = [
        'subcontractor_code',
        'name',
        'phone',
        'email',
        'address',
        'status',
        'user_id',
    ];
}
