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
            if (! Schema::hasColumn('task_details', 'unit')) {
                $table->string('unit', 50)->nullable()->after('detail_name');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('task_details', function (Blueprint $table) {
            if (Schema::hasColumn('task_details', 'unit')) {
                $table->dropColumn('unit');
            }
        });
    }
};
