<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('project_payment')) {
            return;
        }

        DB::table('project_payment')
            ->whereIn('status', ['Bị hủy', 'CANCELLED'])
            ->update(['status' => 'Chờ duyệt']);
    }

    public function down(): void
    {
        // Không khôi phục giá trị "Bị hủy" để tránh tái tạo trạng thái đã loại bỏ.
    }
};
