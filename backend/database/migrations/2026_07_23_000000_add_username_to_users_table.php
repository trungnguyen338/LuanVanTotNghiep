<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('users', 'username')) {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            $table->string('username')->nullable()->unique()->after('id');
        });

        $users = DB::table('users')->orderBy('id')->get();
        $existingUsernames = [];

        foreach ($users as $user) {
            $baseUsername = $this->buildUsernameFromEmail($user->email ?? null, $user->id);
            $username = $baseUsername;
            $suffix = 2;

            while (in_array($username, $existingUsernames, true)) {
                $username = $baseUsername.'-'.$suffix;
                $suffix++;
            }

            $existingUsernames[] = $username;

            DB::table('users')
                ->where('id', $user->id)
                ->update(['username' => $username]);
        }
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique('users_username_unique');
            $table->dropColumn('username');
        });
    }

    protected function buildUsernameFromEmail(?string $email, int $userId): string
    {
        if (! $email) {
            return 'user-'.$userId;
        }

        $localPart = Str::before(Str::lower(trim($email)), '@');
        $localPart = Str::before($localPart, '+');
        $username = preg_replace('/[^a-z0-9._-]/', '', $localPart) ?: ('user-'.$userId);
        $username = trim($username, '._-');

        return $username !== '' ? $username : 'user-'.$userId;
    }
};
