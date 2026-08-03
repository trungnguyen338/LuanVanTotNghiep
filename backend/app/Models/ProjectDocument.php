<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProjectDocument extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'project_id',
        'type_id',
        'doc_name',
        'file_path',
        'documentable_id',
        'documentable_type',
        'document_name',
        'document_type_id',
        'file_url',
        'status',
    ];

    protected $appends = [
        'document_name',
        'document_type_id',
        'file_url',
        'download_url',
    ];

    public function project()
    {
        return $this->belongsTo(Project::class, 'project_id');
    }

    public function documentType()
    {
        return $this->belongsTo(DocumentType::class, 'type_id');
    }

    public function getDocumentNameAttribute()
    {
        return $this->doc_name;
    }

    public function setDocumentNameAttribute($value)
    {
        $this->attributes['doc_name'] = $value;
    }

    public function getDocumentTypeIdAttribute()
    {
        return $this->type_id;
    }

    public function setDocumentTypeIdAttribute($value)
    {
        $this->attributes['type_id'] = $value;
    }

    public function getFileUrlAttribute()
    {
        $value = $this->file_path;

        if (! $value) {
            return null;
        }

        if (filter_var($value, FILTER_VALIDATE_URL)) {
            return $value;
        }

        return asset('storage/'.ltrim($value, '/'));
    }

    public function setFileUrlAttribute($value)
    {
        $this->attributes['file_path'] = $this->normalizeStoragePath($value);
    }

    public function getDownloadUrlAttribute()
    {
        if (! $this->exists || ! $this->id) {
            return null;
        }

        return "/api/project-documents/{$this->id}/download";
    }

    private function normalizeStoragePath(?string $value): ?string
    {
        if (! $value) {
            return $value;
        }

        $storageMarker = '/storage/';
        $storagePosition = strpos($value, $storageMarker);

        if ($storagePosition !== false) {
            return substr($value, $storagePosition + strlen($storageMarker));
        }

        return ltrim($value, '/');
    }

    public function documentable()
    {
        return $this->morphTo();
    }
}
