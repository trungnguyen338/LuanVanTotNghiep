<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('project_tasks') && Schema::hasColumn('project_tasks', 'work_volume')) {
            Schema::table('project_tasks', function (Blueprint $table) {
                $table->dropColumn('work_volume');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('project_tasks') && ! Schema::hasColumn('project_tasks', 'work_volume')) {
            Schema::table('project_tasks', function (Blueprint $table) {
                $table->decimal('work_volume', 15, 2)->default(0)->after('task_type');
            });
        }
    }
};
