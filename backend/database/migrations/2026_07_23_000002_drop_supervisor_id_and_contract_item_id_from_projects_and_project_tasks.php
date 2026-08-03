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
        Schema::table('projects', function (Blueprint $table) {
            $table->dropForeign('fk_projects_supervisor');
            $table->dropColumn('supervisor_id');
        });

        Schema::table('project_tasks', function (Blueprint $table) {
            $table->dropForeign('fk_tasks_contract_item');
            $table->dropColumn('contract_item_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->unsignedBigInteger('supervisor_id')->nullable(false)->after('customer_id');
            $table->foreign('supervisor_id', 'fk_projects_supervisor')->references('id')->on('users');
        });

        Schema::table('project_tasks', function (Blueprint $table) {
            $table->unsignedBigInteger('contract_item_id')->nullable(false)->after('project_id');
            $table->foreign('contract_item_id', 'fk_tasks_contract_item')->references('id')->on('contract_items');
        });
    }
};
