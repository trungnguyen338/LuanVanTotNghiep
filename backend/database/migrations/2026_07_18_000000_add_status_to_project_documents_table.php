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
        if (! Schema::hasTable('project_documents')) {
            return;
        }

        Schema::table('project_documents', function (Blueprint $table) {
            if (! Schema::hasColumn('project_documents', 'status')) {
                $table->string('status', 50)->default('ACTIVE');
            }
        });

        DB::table('project_documents')
            ->whereIn('status', ['PENDING', 'PROCESSING', 'REVISION'])
            ->update(['status' => 'DRAFT']);

        DB::table('project_documents')
            ->whereIn('status', ['COMPLETED', 'REJECTED', 'CANCELLED', 'TERMINATED'])
            ->update(['status' => 'ARCHIVED']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (! Schema::hasTable('project_documents')) {
            return;
        }

        Schema::table('project_documents', function (Blueprint $table) {
            if (Schema::hasColumn('project_documents', 'status')) {
                $table->dropColumn('status');
            }
        });
    }
};
