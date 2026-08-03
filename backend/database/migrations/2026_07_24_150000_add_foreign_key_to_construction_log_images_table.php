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
        DB::table('construction_log_images')
            ->whereNotExists(function ($query) {
                $query->select(DB::raw(1))
                    ->from('construction_logs')
                    ->whereColumn('construction_logs.id', 'construction_log_images.log_id');
            })
            ->delete();

        $hasForeignKey = collect(Schema::getForeignKeys('construction_log_images'))
            ->contains(fn (array $foreignKey) => $foreignKey['columns'] === ['log_id']
                && $foreignKey['foreign_table'] === 'construction_logs'
                && $foreignKey['foreign_columns'] === ['id']);

        if (! $hasForeignKey) {
            Schema::table('construction_log_images', function (Blueprint $table) {
                $table->foreign('log_id', 'fk_construction_log_images_log')
                    ->references('id')
                    ->on('construction_logs')
                    ->cascadeOnDelete();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (collect(Schema::getForeignKeys('construction_log_images'))
            ->contains('name', 'fk_construction_log_images_log')) {
            Schema::table('construction_log_images', function (Blueprint $table) {
                $table->dropForeign('fk_construction_log_images_log');
            });
        }
    }
};
