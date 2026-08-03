<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Add status to contract_items
        Schema::table('contract_items', function (Blueprint $table) {
            if (! Schema::hasColumn('contract_items', 'status')) {
                $table->string('status', 50)->default('active')->after('unit_price');
            }
        });

        // 2. Modify enum for project_tasks status
        if (Schema::getConnection()->getDriverName() !== 'sqlite') {
            // DB::statement("ALTER TABLE project_tasks MODIFY COLUMN status ENUM('TODO', 'DOING', 'DONE', 'Đã hủy') NOT NULL DEFAULT 'TODO'");
            DB::statement("ALTER TABLE task_details MODIFY COLUMN status ENUM('Chưa thực hiện', 'Đang thực hiện', 'Đã hoàn thành', 'Tạm dừng', 'Đã hủy') NOT NULL DEFAULT 'Chưa thực hiện'");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('contract_items', function (Blueprint $table) {
            if (Schema::hasColumn('contract_items', 'status')) {
                $table->dropColumn('status');
            }
        });

        if (Schema::getConnection()->getDriverName() !== 'sqlite') {
            // DB::statement("ALTER TABLE project_tasks MODIFY COLUMN status ENUM('TODO', 'DOING', 'DONE') NOT NULL DEFAULT 'TODO'");
            DB::statement("ALTER TABLE task_details MODIFY COLUMN status ENUM('Chưa thực hiện', 'Đang thực hiện', 'Đã hoàn thành', 'Tạm dừng') NOT NULL DEFAULT 'Chưa thực hiện'");
        }
    }
};
