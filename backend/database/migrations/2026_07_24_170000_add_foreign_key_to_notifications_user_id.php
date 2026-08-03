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
        $hasForeignKey = collect(Schema::getForeignKeys('notifications'))
            ->contains(fn (array $foreignKey) => $foreignKey['columns'] === ['user_id']
                && $foreignKey['foreign_table'] === 'users'
                && $foreignKey['foreign_columns'] === ['id']);

        if (! $hasForeignKey) {
            Schema::table('notifications', function (Blueprint $table) {
                $table->foreign('user_id', 'fk_notifications_user')
                    ->references('id')
                    ->on('users')
                    ->cascadeOnDelete();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (collect(Schema::getForeignKeys('notifications'))
            ->contains('name', 'fk_notifications_user')) {
            Schema::table('notifications', function (Blueprint $table) {
                $table->dropForeign('fk_notifications_user');
            });
        }
    }
};
