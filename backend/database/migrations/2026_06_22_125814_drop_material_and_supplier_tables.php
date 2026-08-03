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
        // 1. Drop foreign key and column on project_payment table
        try {
            Schema::table('project_payment', function (Blueprint $table) {
                $table->dropForeign('fk_payments_material');
            });
        } catch (Exception $e) {
        }

        try {
            Schema::table('project_payment', function (Blueprint $table) {
                $table->dropForeign('project_payments_material_contract_id_foreign');
            });
        } catch (Exception $e) {
        }

        try {
            Schema::table('project_payment', function (Blueprint $table) {
                $table->dropForeign('project_payment_material_contract_id_foreign');
            });
        } catch (Exception $e) {
        }

        Schema::table('project_payment', function (Blueprint $table) {
            if (Schema::hasColumn('project_payment', 'material_contract_id')) {
                $table->dropColumn('material_contract_id');
            }
        });

        // 2. Drop the tables
        Schema::dropIfExists('task_material_usage');
        Schema::dropIfExists('material_contract_items');
        Schema::dropIfExists('material_contract_documents');
        Schema::dropIfExists('material_contracts');
        Schema::dropIfExists('material_units');
        Schema::dropIfExists('suppliers');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No rollback as this is a drop operation for feature removal
    }
};
