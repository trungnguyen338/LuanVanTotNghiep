<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('project_tasks') || ! Schema::hasColumn('project_tasks', 'task_type')) {
            return;
        }

        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        DB::statement("
            ALTER TABLE project_tasks
            MODIFY task_type ENUM(
                'Thi công móng',
                'Khung kết cấu',
                'Hoàn thiện',
                'Cơ điện ME',
                'Thi công trực tiếp',
                'Hạng mục kỹ thuật / Thiết kế'
            ) NOT NULL DEFAULT 'Thi công trực tiếp'
        ");

        DB::table('project_tasks')
            ->whereIn('task_type', ['Thi công móng', 'Khung kết cấu', 'Hoàn thiện', 'CONSTRUCTION'])
            ->update(['task_type' => 'Thi công trực tiếp']);

        DB::table('project_tasks')
            ->whereIn('task_type', ['Cơ điện ME', 'TECHNICAL'])
            ->update(['task_type' => 'Hạng mục kỹ thuật / Thiết kế']);

        DB::statement("
            ALTER TABLE project_tasks
            MODIFY task_type ENUM(
                'Thi công trực tiếp',
                'Hạng mục kỹ thuật / Thiết kế'
            ) NOT NULL DEFAULT 'Thi công trực tiếp'
        ");
    }

    public function down(): void
    {
        if (! Schema::hasTable('project_tasks') || ! Schema::hasColumn('project_tasks', 'task_type')) {
            return;
        }

        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        DB::statement("
            ALTER TABLE project_tasks
            MODIFY task_type ENUM(
                'Thi công móng',
                'Khung kết cấu',
                'Hoàn thiện',
                'Cơ điện ME',
                'Thi công trực tiếp',
                'Hạng mục kỹ thuật / Thiết kế'
            ) NOT NULL
        ");

        DB::table('project_tasks')
            ->where('task_type', 'Thi công trực tiếp')
            ->update(['task_type' => 'Khung kết cấu']);

        DB::table('project_tasks')
            ->where('task_type', 'Hạng mục kỹ thuật / Thiết kế')
            ->update(['task_type' => 'Cơ điện ME']);

        DB::statement("
            ALTER TABLE project_tasks
            MODIFY task_type ENUM(
                'Thi công móng',
                'Khung kết cấu',
                'Hoàn thiện',
                'Cơ điện ME'
            ) NOT NULL
        ");
    }
};
