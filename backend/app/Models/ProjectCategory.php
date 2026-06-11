<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProjectCategory extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'category_code',
        'name',
        'status',
    ];

    public function projects()
    {
        return $this->hasMany(Project::class, 'category_id');
    }
}
