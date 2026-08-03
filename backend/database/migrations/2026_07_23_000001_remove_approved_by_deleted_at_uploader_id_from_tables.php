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
        if (Schema::hasTable('task_details') && Schema::hasColumn('task_details', 'approved_by')) {
            Schema::table('task_details', function (Blueprint $table) {
                try {
                    $table->dropForeign('fk_details_approver');
                } catch (\Throwable $e) {
                }

                $table->dropColumn('approved_by');
            });
        }

        if (Schema::hasTable('project_categories') && Schema::hasColumn('project_categories', 'deleted_at')) {
            Schema::table('project_categories', function (Blueprint $table) {
                $table->dropSoftDeletes();
            });
        }

        if (Schema::hasTable('project_documents') && Schema::hasColumn('project_documents', 'uploader_id')) {
            Schema::table('project_documents', function (Blueprint $table) {
                try {
                    $table->dropForeign('fk_docs_uploader');
                } catch (\Throwable $e) {
                }

                $table->dropColumn('uploader_id');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('task_details') && ! Schema::hasColumn('task_details', 'approved_by')) {
            Schema::table('task_details', function (Blueprint $table) {
                $table->unsignedBigInteger('approved_by')->nullable()->after('rejection_note');
                $table->foreign('approved_by', 'fk_details_approver')->references('id')->on('users');
            });
        }

        if (Schema::hasTable('project_categories') && ! Schema::hasColumn('project_categories', 'deleted_at')) {
            Schema::table('project_categories', function (Blueprint $table) {
                $table->softDeletes();
            });
        }

        if (Schema::hasTable('project_documents') && ! Schema::hasColumn('project_documents', 'uploader_id')) {
            Schema::table('project_documents', function (Blueprint $table) {
                $table->unsignedBigInteger('uploader_id')->nullable()->after('type_id');
                $table->foreign('uploader_id', 'fk_docs_uploader')->references('id')->on('users');
            });
        }
    }
};
