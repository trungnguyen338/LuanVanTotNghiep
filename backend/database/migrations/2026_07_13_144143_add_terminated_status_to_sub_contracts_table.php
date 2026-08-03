<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::statement("ALTER TABLE sub_contracts MODIFY COLUMN status ENUM('Nháp','Có hiệu lực','Đã thanh lý','Bị hủy') NOT NULL DEFAULT 'Nháp'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("UPDATE sub_contracts SET status = 'Đã thanh lý' WHERE status = 'Bị hủy'");
        DB::statement("ALTER TABLE sub_contracts MODIFY COLUMN status ENUM('Nháp','Có hiệu lực','Đã thanh lý') NOT NULL DEFAULT 'Nháp'");
    }
};
