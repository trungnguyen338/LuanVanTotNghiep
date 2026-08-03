<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('subcontractors', function (Blueprint $table) {
            $table->dropColumn(['name', 'phone', 'email']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('subcontractors', function (Blueprint $table) {
            $table->string('name', 150);
            $table->string('phone', 20)->nullable();
            $table->string('email', 100)->nullable();
        });
    }
};
