<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ConstructionLogImage extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $table = 'construction_log_images';

    protected $fillable = [
        'log_id',
        'construction_log_id',
        'image_url',
    ];

    protected $appends = ['construction_log_id'];

    public function getConstructionLogIdAttribute()
    {
        return $this->log_id;
    }

    public function setConstructionLogIdAttribute($value)
    {
        $this->attributes['log_id'] = $value;
    }

    public function getImageUrlAttribute($value)
    {
        if (! $value) {
            return null;
        }

        if (filter_var($value, FILTER_VALIDATE_URL)) {
            // Nếu là URL nội bộ (chứa localhost hoặc 127.0.0.1), ta chuyển về relative path để tự động sinh lại theo host hiện tại
            $storageMarker = '/storage/';
            $storagePosition = strpos($value, $storageMarker);
            if ($storagePosition !== false && (str_contains($value, 'localhost') || str_contains($value, '127.0.0.1'))) {
                $value = substr($value, $storagePosition + strlen($storageMarker));
            } else {
                return $value;
            }
        }

        return asset('storage/'.ltrim($value, '/'));
    }

    public function setImageUrlAttribute($value)
    {
        $this->attributes['image_url'] = $this->normalizeStoragePath($value);
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

    public function log()
    {
        return $this->belongsTo(ConstructionLog::class, 'log_id');
    }
}
