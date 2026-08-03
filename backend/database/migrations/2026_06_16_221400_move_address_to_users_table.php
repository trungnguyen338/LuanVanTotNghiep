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
        // 1. Add address to users table
        Schema::table('users', function (Blueprint $table) {
            $table->text('address')->nullable()->after('phone');
        });

        // 2. Data migration: Copy address from customers and subcontractors to users
        $customers = DB::table('customers')->whereNotNull('address')->get();
        foreach ($customers as $customer) {
            if ($customer->user_id) {
                DB::table('users')
                    ->where('id', $customer->user_id)
                    ->update(['address' => $customer->address]);
            }
        }

        $subcontractors = DB::table('subcontractors')->whereNotNull('address')->get();
        foreach ($subcontractors as $sub) {
            if ($sub->user_id) {
                DB::table('users')
                    ->where('id', $sub->user_id)
                    ->update(['address' => $sub->address]);
            }
        }

        // 3. Drop address column from customers and subcontractors
        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn('address');
        });

        Schema::table('subcontractors', function (Blueprint $table) {
            $table->dropColumn('address');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // 1. Re-add address column to customers and subcontractors
        Schema::table('customers', function (Blueprint $table) {
            $table->text('address')->nullable();
        });

        Schema::table('subcontractors', function (Blueprint $table) {
            $table->text('address')->nullable();
        });

        // 2. Restore data: Copy address back from users to customers and subcontractors
        $customers = DB::table('customers')->get();
        foreach ($customers as $customer) {
            if ($customer->user_id) {
                $user = DB::table('users')->where('id', $customer->user_id)->first();
                if ($user && $user->address) {
                    DB::table('customers')
                        ->where('id', $customer->id)
                        ->update(['address' => $user->address]);
                }
            }
        }

        $subcontractors = DB::table('subcontractors')->get();
        foreach ($subcontractors as $sub) {
            if ($sub->user_id) {
                $user = DB::table('users')->where('id', $sub->user_id)->first();
                if ($user && $user->address) {
                    DB::table('subcontractors')
                        ->where('id', $sub->id)
                        ->update(['address' => $user->address]);
                }
            }
        }

        // 3. Drop address from users
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('address');
        });
    }
};
