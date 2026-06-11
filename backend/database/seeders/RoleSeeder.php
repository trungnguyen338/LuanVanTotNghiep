<?php

namespace Database\Seeders;

use App\Models\Role;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $roles = [
            'Kế toán',
            'Kỹ sư',
            'Giám sát'
        ];

        foreach ($roles as $roleName) {
            Role::firstOrCreate(
                ['name' => $roleName],
                [
                    'permissions' => json_encode(['*']),
                    'level' => 2,
                    'status' => 1
                ]
            );
        }

        $this->command->info('Các vai trò mới đã được thêm thành công!');
    }
}
