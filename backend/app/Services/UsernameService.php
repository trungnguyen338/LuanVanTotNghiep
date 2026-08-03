<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Str;

class UsernameService
{
    /**
     * Build a unique username from a Gmail address.
     */
    public function generateFromEmail(string $email, ?int $ignoreUserId = null): string
    {
        $localPart = Str::before(Str::lower(trim($email)), '@');
        $localPart = Str::before($localPart, '+');
        $username = preg_replace('/[^a-z0-9._-]/', '', $localPart) ?: 'user';
        $username = trim($username, '._-') ?: 'user';

        $candidate = $username;
        $suffix = 2;

        while ($this->usernameExists($candidate, $ignoreUserId)) {
            $candidate = $username.'-'.$suffix;
            $suffix++;
        }

        return $candidate;
    }

    protected function usernameExists(string $username, ?int $ignoreUserId = null): bool
    {
        $query = User::query()->where('username', $username);

        if ($ignoreUserId !== null) {
            $query->where('id', '!=', $ignoreUserId);
        }

        return $query->exists();
    }
}
