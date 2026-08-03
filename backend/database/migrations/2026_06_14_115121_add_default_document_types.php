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
        $types = [
            ['type_name' => 'Hợp đồng khách hàng', 'created_at' => now()],
            ['type_name' => 'Bản vẽ thiết kế', 'created_at' => now()],
            ['type_name' => 'Giấy phép xây dựng', 'created_at' => now()],
            ['type_name' => 'Biên bản bàn giao', 'created_at' => now()],
            ['type_name' => 'Tài liệu hành chính', 'created_at' => now()],
            ['type_name' => 'Biên bản nghiệm thu', 'created_at' => now()],
            ['type_name' => 'Khác', 'created_at' => now()],
        ];

        foreach ($types as $type) {
            DB::table('document_types')->updateOrInsert(
                ['type_name' => $type['type_name']],
                ['created_at' => $type['created_at']]
            );
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('document_types')->whereIn('type_name', [
            'Bản vẽ thiết kế',
            'Giấy phép xây dựng',
            'Biên bản bàn giao',
            'Tài liệu hành chính',
            'Biên bản nghiệm thu',
            'Khác',
        ])->delete();
    }
};
