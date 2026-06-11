<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProjectTask extends Model
{
    use HasFactory;

    const UPDATED_AT = null;

    protected $fillable = [
        'project_id',
        'task_name',
        'progress_percent',
    ];

    public function project()
    {
        return $this->belongsTo(Project::class, 'project_id');
    }
}
