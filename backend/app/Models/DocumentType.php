<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DocumentType extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'type_name',
    ];

    public function projectDocuments()
    {
        return $this->hasMany(ProjectDocument::class, 'document_type_id');
    }
}
