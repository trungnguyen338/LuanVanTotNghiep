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
        Schema::table('detail_contract_contractor', function (Blueprint $table) {
            if (Schema::hasColumn('detail_contract_contractor', 'share_percentage')) {
                $table->dropColumn('share_percentage');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('detail_contract_contractor', function (Blueprint $table) {
            if (! Schema::hasColumn('detail_contract_contractor', 'share_percentage')) {
                $table->decimal('share_percentage', 5, 2)->default(100.00);
            }
        });
    }
};
