<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('task_details', function (Blueprint $table) {
            if (! Schema::hasColumn('task_details', 'status')) {
                $table->enum('status', ['Chưa thực hiện', 'Đang thực hiện', 'Đã hoàn thành', 'Tạm dừng'])
                    ->default('Chưa thực hiện')
                    ->after('end_date');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('task_details', function (Blueprint $table) {
            if (Schema::hasColumn('task_details', 'status')) {
                $table->dropColumn('status');
            }
        });
    }
};
