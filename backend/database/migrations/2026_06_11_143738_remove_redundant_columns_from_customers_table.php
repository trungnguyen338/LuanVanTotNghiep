<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            if (Schema::getConnection()->getDriverName() !== 'sqlite') {
                $table->dropUnique('email');
            }
            $table->dropColumn(['full_name', 'email', 'phone', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->string('full_name', 150);
            $table->string('email', 191)->unique();
            $table->string('phone', 20);
            $table->tinyInteger('status')->default(1);
        });
    }
};
