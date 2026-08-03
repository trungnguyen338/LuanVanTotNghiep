<?php

namespace Database\Seeders;

use App\Models\ClientContract;
use App\Models\Customer;
use App\Models\DetailContractContractor;
use App\Models\DocumentType;
use App\Models\Project;
use App\Models\ProjectCategory;
use App\Models\ProjectTask;
use App\Models\Role;
use App\Models\SubContract;
use App\Models\Subcontractor;
use App\Models\TaskDetail;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 0. Document Types
        $types = [
            'Hợp đồng khách hàng',
            'Bản vẽ thiết kế',
            'Giấy phép xây dựng',
            'Biên bản bàn giao',
            'Tài liệu hành chính',
            'Biên bản nghiệm thu',
            'Khác',
        ];
        foreach ($types as $typeName) {
            DocumentType::firstOrCreate(['type_name' => $typeName]);
        }

        // 1. Roles
        $adminRole = Role::firstOrCreate(
            ['name' => 'Quản trị viên'],
            ['permissions' => json_encode(['*']), 'status' => 1]
        );

        $subRole = Role::firstOrCreate(
            ['name' => 'Nhà thầu phụ'],
            ['permissions' => json_encode([]), 'status' => 1]
        );

        $customerRole = Role::firstOrCreate(
            ['name' => 'Khách hàng'],
            ['permissions' => json_encode([]), 'status' => 1]
        );

        // 2. Users
        $adminUser = User::firstOrCreate(
            ['username' => 'admin'],
            [
                'email' => 'admin@example.com',
                'full_name' => 'Hệ Thống Admin',
                'phone' => '0987654321',
                'password_hash' => Hash::make('password'),
                'role_id' => $adminRole->id,
                'status' => 1,
            ]
        );

        $subUser = User::firstOrCreate(
            ['username' => 'subcontractor'],
            [
                'email' => 'subcontractor@example.com',
                'full_name' => 'Nhà thầu phụ A',
                'phone' => '0987654323',
                'password_hash' => Hash::make('password'),
                'role_id' => $subRole->id,
                'status' => 1,
                'address' => 'Hải Phòng, Việt Nam',
            ]
        );

        $customerUser = User::firstOrCreate(
            ['username' => 'customer'],
            [
                'email' => 'customer@example.com',
                'full_name' => 'Khách hàng VIP',
                'phone' => '0987654324',
                'password_hash' => Hash::make('password'),
                'role_id' => $customerRole->id,
                'status' => 1,
                'address' => 'Hà Nội, Việt Nam',
            ]
        );

        // 3. Customers
        $customer = Customer::firstOrCreate(
            ['user_id' => $customerUser->id],
            [
                'customer_code' => 'KH-0001',
            ]
        );

        // 4. Subcontractors
        $subcontractor = Subcontractor::firstOrCreate(
            ['user_id' => $subUser->id],
            [
                'subcontractor_code' => 'NTP-0001',
                'status' => 1,
            ]
        );

        // 6. Project Category
        $category = ProjectCategory::firstOrCreate(
            ['name' => 'Xây dựng cao ốc'],
            [
                'category_code' => 'CAT-0001',
                'status' => 1,
            ]
        );

        // 7. Projects
        $project = Project::firstOrCreate(
            ['name' => 'Xây dựng cao ốc Trung Nguyên'],
            [
                'project_code' => 'PRO-0260',
                'category_id' => $category->id,
                'customer_id' => $customer->id,
                'address' => 'Quận 1, TP. Hồ Chí Minh',
                'status' => 'PROCESSING',
            ]
        );

        // 8. Client Contracts
        $clientContract = ClientContract::firstOrCreate(
            ['contract_code' => 'HD-CUS-001'],
            [
                'project_id' => $project->id,
                'contract_name' => 'Hợp đồng thiết kế & thi công xây dựng thô',
                'total_value' => 45200000000.00,
                'signed_date' => Carbon::now()->subMonths(1)->toDateString(),
                'status' => 'ACTIVE',
            ]
        );

        // 9. Sub Contracts
        $subContract = SubContract::firstOrCreate(
            ['contract_code' => 'HD-SUB-001'],
            [
                'project_id' => $project->id,
                'total_value' => 14000000000.00,
                'signed_date' => Carbon::now()->subMonths(1)->toDateString(),
                'status' => 'ACTIVE',
            ]
        );

        // 10. Pivot sub_contracts & subcontractors
        $pivot = DetailContractContractor::firstOrCreate(
            ['sub_contract_id' => $subContract->id, 'subcontractor_id' => $subcontractor->id],
            ['share_percentage' => 100.00]
        );

        // 11. Project Tasks
        $projectTask = ProjectTask::firstOrCreate(
            ['project_id' => $project->id, 'task_name' => 'Phần móng và thân cao ốc'],
            [
                'task_type' => ProjectTask::TYPE_CONSTRUCTION,
                'status' => 'DOING',
                'progress_percent' => 45,
            ]
        );

        // 12. Task Details (Subcontractor Assignments)
        TaskDetail::firstOrCreate(
            ['project_task_id' => $projectTask->id, 'detail_name' => 'Đổ bê tông móng đợt 1'],
            [
                'contractor_detail_id' => $pivot->id,
                'work_volume' => 100.00,
                'agreed_price' => 150000.00,
                'progress_percent' => 30,
                'status' => 'DOING',
                'acceptance_status' => 'NONE',
                'start_date' => Carbon::now()->subDays(1)->toDateString(),
                'end_date' => Carbon::now()->toDateString(), // Today
            ]
        );

        TaskDetail::firstOrCreate(
            ['project_task_id' => $projectTask->id, 'detail_name' => 'Lắp đặt dầm sàn thép tầng hầm'],
            [
                'contractor_detail_id' => $pivot->id,
                'work_volume' => 50.00,
                'agreed_price' => 200000.00,
                'progress_percent' => 10,
                'status' => 'DOING',
                'acceptance_status' => 'NONE',
                'start_date' => Carbon::now()->subDays(2)->toDateString(),
                'end_date' => Carbon::now()->addDay()->toDateString(), // Tomorrow
            ]
        );

        TaskDetail::firstOrCreate(
            ['project_task_id' => $projectTask->id, 'detail_name' => 'Giải phóng mặt bằng & dọn dẹp vệ sinh'],
            [
                'contractor_detail_id' => $pivot->id,
                'work_volume' => 1.00,
                'agreed_price' => 5000000.00,
                'progress_percent' => 80,
                'status' => 'DOING',
                'acceptance_status' => 'NONE',
                'start_date' => Carbon::now()->subDays(10)->toDateString(),
                'end_date' => Carbon::now()->subDays(2)->toDateString(), // 2 days overdue
            ]
        );
    }
}
