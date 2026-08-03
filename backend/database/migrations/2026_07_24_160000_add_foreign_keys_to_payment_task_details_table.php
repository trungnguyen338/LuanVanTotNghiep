<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::table('payment_task_details')
            ->whereNotExists(function ($query) {
                $query->select(DB::raw(1))
                    ->from('project_payment')
                    ->whereColumn('project_payment.id', 'payment_task_details.payment_id');
            })
            ->delete();

        DB::table('payment_task_details')
            ->whereNotExists(function ($query) {
                $query->select(DB::raw(1))
                    ->from('task_details')
                    ->whereColumn('task_details.id', 'payment_task_details.task_detail_id');
            })
            ->delete();

        $foreignKeys = collect(Schema::getForeignKeys('payment_task_details'));

        if (! $foreignKeys->contains(fn (array $foreignKey) => $foreignKey['columns'] === ['payment_id']
            && $foreignKey['foreign_table'] === 'project_payment'
            && $foreignKey['foreign_columns'] === ['id'])) {
            Schema::table('payment_task_details', function (Blueprint $table) {
                $table->foreign('payment_id', 'fk_payment_task_details_payment')
                    ->references('id')
                    ->on('project_payment')
                    ->cascadeOnDelete();
            });
        }

        if (! $foreignKeys->contains(fn (array $foreignKey) => $foreignKey['columns'] === ['task_detail_id']
            && $foreignKey['foreign_table'] === 'task_details'
            && $foreignKey['foreign_columns'] === ['id'])) {
            Schema::table('payment_task_details', function (Blueprint $table) {
                $table->foreign('task_detail_id', 'fk_payment_task_details_task_detail')
                    ->references('id')
                    ->on('task_details')
                    ->cascadeOnDelete();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $foreignKeys = collect(Schema::getForeignKeys('payment_task_details'));

        if ($foreignKeys->contains('name', 'fk_payment_task_details_payment')) {
            Schema::table('payment_task_details', function (Blueprint $table) {
                $table->dropForeign('fk_payment_task_details_payment');
            });
        }

        if ($foreignKeys->contains('name', 'fk_payment_task_details_task_detail')) {
            Schema::table('payment_task_details', function (Blueprint $table) {
                $table->dropForeign('fk_payment_task_details_task_detail');
            });
        }
    }
};
