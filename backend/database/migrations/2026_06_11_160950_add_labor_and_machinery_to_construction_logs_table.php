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
        Schema::table('construction_logs', function (Blueprint $table) {
            $table->string('labor', 255)->nullable()->after('weather')->comment('Nhân lực (ví dụ: 10 người)');
            $table->string('machinery', 255)->nullable()->after('labor')->comment('Máy móc thi công');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('construction_logs', function (Blueprint $table) {
            $table->dropColumn(['labor', 'machinery']);
        });
    }
};
