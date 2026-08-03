<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\Project;
use Illuminate\Support\Facades\Log;

class ProjectCustomerNotificationService
{
    /**
     * Tạo thông báo cho khách hàng của dự án nếu dự án có gắn customer/user hợp lệ.
     */
    public function notify(Project $project, string $title, string $content, string $type, ?int $relatedId = null): void
    {
        try {
            $project->loadMissing('customer.user');

            $userId = $project->customer?->user_id;
            if (! $userId) {
                return;
            }

            Notification::create([
                'user_id' => $userId,
                'title' => $title,
                'content' => $content,
                'type' => $type,
                'related_id' => $relatedId,
                'is_read' => false,
                'created_at' => now(),
            ]);
        } catch (\Throwable $e) {
            Log::warning('Không thể tạo thông báo khách hàng cho dự án '.$project->id.': '.$e->getMessage());
        }
    }
}
