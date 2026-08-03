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
        // 1. roles table
        Schema::table('roles', function (Blueprint $table) {
            if (Schema::hasColumn('roles', 'level')) {
                $table->dropColumn('level');
            }
        });

        // 2. customers table
        Schema::table('customers', function (Blueprint $table) {
            if (! Schema::hasColumn('customers', 'status')) {
                $table->tinyInteger('status')->default(1)->after('customer_code');
            }
        });

        // 3. subcontractors table
        Schema::table('subcontractors', function (Blueprint $table) {
            if (Schema::hasColumn('subcontractors', 'status') && Schema::getConnection()->getDriverName() !== 'sqlite') {
                $table->tinyInteger('status')->default(1)->change();
            }
        });

        // 4. project_tasks table
        Schema::table('project_tasks', function (Blueprint $table) {
            if (Schema::hasColumn('project_tasks', 'acceptance_status')) {
                $table->dropColumn('acceptance_status');
            }
            if (Schema::hasColumn('project_tasks', 'rejection_note')) {
                $table->dropColumn('rejection_note');
            }
            if (Schema::hasColumn('project_tasks', 'approved_by')) {
                try {
                    $table->dropForeign('fk_projecttasks_approved_by');
                } catch (Exception $e) {
                }
                $table->dropColumn('approved_by');
            }
            if (Schema::hasColumn('project_tasks', 'completed_date')) {
                $table->dropColumn('completed_date');
            }
        });

        // 5. client_contracts table
        Schema::table('client_contracts', function (Blueprint $table) {
            if (Schema::hasColumn('client_contracts', 'contract_value')) {
                $table->renameColumn('contract_value', 'total_value');
            }
        });

        // 6. contract_items table
        Schema::table('contract_items', function (Blueprint $table) {
            if (Schema::hasColumn('contract_items', 'client_contract_id')) {
                $table->renameColumn('client_contract_id', 'contract_id');
            }
            if (Schema::hasColumn('contract_items', 'price')) {
                $table->dropColumn('price');
            }
            if (Schema::hasColumn('contract_items', 'description')) {
                $table->dropColumn('description');
            }
            $table->decimal('volume', 15, 2)->default(0.00)->after('item_name');
            $table->decimal('unit_price', 15, 2)->default(0.00)->after('volume');
        });

        // 7. material_contracts table
        Schema::table('material_contracts', function (Blueprint $table) {
            if (Schema::hasColumn('material_contracts', 'contract_value')) {
                $table->renameColumn('contract_value', 'total_value');
            }
        });

        // 8. material_contract_items table
        Schema::table('material_contract_items', function (Blueprint $table) {
            if (Schema::hasColumn('material_contract_items', 'quantity')) {
                $table->renameColumn('quantity', 'quota_quantity');
            }
        });

        // 9. task_material_usage table
        Schema::table('task_material_usage', function (Blueprint $table) {
            if (Schema::hasColumn('task_material_usage', 'quantity_used')) {
                $table->renameColumn('quantity_used', 'actual_quantity');
            }
        });

        // 10. project_payments table -> project_payment
        if (Schema::hasTable('project_payments')) {
            Schema::rename('project_payments', 'project_payment');
        }

        // 11. project_payment table (add payment_code)
        Schema::table('project_payment', function (Blueprint $table) {
            if (! Schema::hasColumn('project_payment', 'payment_code')) {
                $table->string('payment_code', 50)->nullable()->after('id');
            }
        });

        // 12. payment_task_details table
        Schema::table('payment_task_details', function (Blueprint $table) {
            if (Schema::hasColumn('payment_task_details', 'paid_amount')) {
                $table->renameColumn('paid_amount', 'allocated_amount');
            }
        });

        // 13. payment_project_tasks table (drop)
        Schema::dropIfExists('payment_project_tasks');

        // 14. construction_logs table (drop labor, machinery)
        Schema::table('construction_logs', function (Blueprint $table) {
            if (Schema::hasColumn('construction_logs', 'labor')) {
                $table->dropColumn('labor');
            }
            if (Schema::hasColumn('construction_logs', 'machinery')) {
                $table->dropColumn('machinery');
            }
        });

        // 15. sub_contracts table (add contract_name back if not exists)
        Schema::table('sub_contracts', function (Blueprint $table) {
            if (! Schema::hasColumn('sub_contracts', 'contract_name')) {
                $table->string('contract_name', 255)->nullable()->after('contract_code');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Reverse operations if needed
    }
};
