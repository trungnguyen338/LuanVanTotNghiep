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
        $foreignKeys = collect(Schema::getForeignKeys('contract_addendums'));

        if (! $foreignKeys->contains(fn (array $foreignKey) => $foreignKey['columns'] === ['client_contract_id']
            && $foreignKey['foreign_table'] === 'client_contracts'
            && $foreignKey['foreign_columns'] === ['id'])) {
            Schema::table('contract_addendums', function (Blueprint $table) {
                $table->foreign('client_contract_id', 'fk_contract_addendums_client')
                    ->references('id')
                    ->on('client_contracts')
                    ->cascadeOnDelete();
            });
        }

        if (! $foreignKeys->contains(fn (array $foreignKey) => $foreignKey['columns'] === ['sub_contract_id']
            && $foreignKey['foreign_table'] === 'sub_contracts'
            && $foreignKey['foreign_columns'] === ['id'])) {
            Schema::table('contract_addendums', function (Blueprint $table) {
                $table->foreign('sub_contract_id', 'fk_contract_addendums_sub')
                    ->references('id')
                    ->on('sub_contracts')
                    ->cascadeOnDelete();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $foreignKeys = collect(Schema::getForeignKeys('contract_addendums'));

        if ($foreignKeys->contains('name', 'fk_contract_addendums_client')) {
            Schema::table('contract_addendums', function (Blueprint $table) {
                $table->dropForeign('fk_contract_addendums_client');
            });
        }

        if ($foreignKeys->contains('name', 'fk_contract_addendums_sub')) {
            Schema::table('contract_addendums', function (Blueprint $table) {
                $table->dropForeign('fk_contract_addendums_sub');
            });
        }
    }
};
