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
        // 1. sub_contracts table updates
        Schema::table('sub_contracts', function (Blueprint $table) {
            if (Schema::hasColumn('sub_contracts', 'contract_value')) {
                $table->renameColumn('contract_value', 'total_value');
            }
            if (Schema::hasColumn('sub_contracts', 'contract_name')) {
                $table->dropColumn('contract_name');
            }
        });

        // 2. detail_contract_contractor table updates
        Schema::table('detail_contract_contractor', function (Blueprint $table) {
            if (Schema::hasColumn('detail_contract_contractor', 'role_in_contract')) {
                $table->dropColumn('role_in_contract');
            }
        });

        // 3. task_details table updates
        Schema::table('task_details', function (Blueprint $table) {
            if (Schema::hasColumn('task_details', 'status')) {
                $table->dropColumn('status');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // 3. Revert task_details table updates
        Schema::table('task_details', function (Blueprint $table) {
            $table->enum('status', ['TODO', 'DOING', 'DONE'])->default('TODO');
        });

        // 2. Revert detail_contract_contractor table updates
        Schema::table('detail_contract_contractor', function (Blueprint $table) {
            $table->enum('role_in_contract', ['MAIN', 'MEMBER'])->default('MAIN');
        });

        // 1. Revert sub_contracts table updates
        Schema::table('sub_contracts', function (Blueprint $table) {
            if (Schema::hasColumn('sub_contracts', 'total_value')) {
                $table->renameColumn('total_value', 'contract_value');
            }
            $table->string('contract_name', 255)->default('');
        });
    }
};
