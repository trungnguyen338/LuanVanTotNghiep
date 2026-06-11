# QUY TẮC PHÁT TRIỂN BACKEND

## Thông tin dự án

Tên dự án: website quản lý dự án xây dựng

Công nghệ sử dụng:

- Laravel 12
- PHP 8.4+
- MySQL
- RESTful API

Kiến trúc bắt buộc:

- MVC + Service Layer
- Form Request Validation
- API Resource

---

# Nguyên tắc chung

1. Tuân thủ SOLID.
2. Tuân thủ Clean Code.
3. Dễ bảo trì và mở rộng.
4. Sử dụng Dependency Injection.
5. Không viết code trùng lặp.
6. Tên biến, hàm, class phải rõ nghĩa.
7. Tuân thủ chuẩn Laravel.

---

# Kiến trúc bắt buộc

Mỗi module phải có đầy đủ:

- Model
- Service
- Controller
- Form Request
- Resource

Ví dụ:

app/
├── Models/
│   └── Project.php
│
├── Services/
│   └── ProjectService.php
│
├── Http/
│   ├── Controllers/
│   │   └── ProjectController.php
│   │
│   ├── Requests/
│   │   ├── StoreProjectRequest.php
│   │   └── UpdateProjectRequest.php
│   │
│   └── Resources/
│       └── ProjectResource.php

---

# Quy tắc Controller

Controller chỉ được phép:

1. Nhận request từ client.
2. Gọi Service xử lý nghiệp vụ.
3. Trả dữ liệu bằng Resource.

Controller KHÔNG được:

- Chứa business logic.
- Chứa xử lý nghiệp vụ.
- Query database trực tiếp.
- Validate dữ liệu trực tiếp.

Ví dụ:

public function store(StoreProjectRequest $request)
{
    $project = $this->projectService->store(
        $request->validated()
    );

    return new ProjectResource($project);
}

---

# Quy tắc Service

Toàn bộ nghiệp vụ phải được xử lý trong Service.

Ví dụ:

- Tạo dự án
- Cập nhật dự án
- Phân công công việc
- Duyệt hồ sơ
- Cập nhật tiến độ
- Tính toán chi phí

Service được phép:

- Xử lý nghiệp vụ
- Gọi Model
- Xử lý Transaction

Service KHÔNG được:

- Trả về JSON Response
- Xử lý Request HTTP

---

# Quy tắc Validation

Bắt buộc sử dụng Form Request.

Ví dụ:

- StoreProjectRequest
- UpdateProjectRequest

Controller sử dụng:

$request->validated()

Không validate trực tiếp trong Controller.

---

# Quy tắc Resource

Tất cả API phải trả dữ liệu bằng Resource.

Sai:

return $project;

Đúng:

return new ProjectResource($project);

Danh sách:

return ProjectResource::collection($projects);

Không được trả Model trực tiếp.

---

# Quy tắc Model

Model phải:

- Khai báo fillable.
- Khai báo relationship.
- Khai báo casts khi cần.

Ví dụ:

protected $fillable = [
    'name',
    'status',
    'start_date'
];

Model KHÔNG được chứa:

- Business logic phức tạp.
- Xử lý HTTP.
- Xử lý Response.

---

# Quy tắc Database

Sử dụng Eloquent ORM.

Ưu tiên:

Project::query()

Hạn chế:

DB::table()

Không sử dụng Raw SQL nếu không thực sự cần thiết.

---

# Quy tắc Relationship

Mọi quan hệ phải được khai báo đầy đủ.

Ví dụ:

Project.php

public function tasks()
{
    return $this->hasMany(Task::class);
}

Task.php

public function project()
{
    return $this->belongsTo(Project::class);
}

---


# Quy tắc API

Thiết kế API theo chuẩn RESTful.

Ví dụ:

GET /api/projects

GET /api/projects/{id}

POST /api/projects

PUT /api/projects/{id}

DELETE /api/projects/{id}

Tên API phải dùng số nhiều.

Đúng:

/projects
/tasks
/contracts

Sai:

/project
/task
/contract

---

# Quy tắc Phân trang

Các API danh sách bắt buộc hỗ trợ phân trang.

Ví dụ:

Project::paginate(20);

Không trả toàn bộ dữ liệu nếu dữ liệu lớn.

---

# Quy tắc Tìm kiếm và Lọc

Danh sách dữ liệu phải hỗ trợ:

- Search
- Filter
- Sort
- Pagination

Ưu tiên xử lý tại Service.

---

# Quy tắc Eager Loading

Bắt buộc sử dụng eager loading để tránh N+1 Query.

Ví dụ:

Project::with([
    'tasks',
    'manager',
    'customer'
])->get();

---

# Quy tắc Xử lý lỗi

Không hiển thị lỗi hệ thống cho người dùng.

Ghi log các lỗi quan trọng.

Sử dụng try-catch khi cần thiết.

Ví dụ:

try {

} catch (\Exception $e) {

    Log::error($e->getMessage());

    throw $e;
}

---

# Quy tắc Bảo mật

Mọi request đều phải được kiểm tra quyền.

Không tin tưởng dữ liệu từ frontend.

Luôn validate dữ liệu đầu vào.

Sử dụng:

- Laravel Sanctum hoặc JWT
- Policy
- Middleware

khi cần thiết.

---

# Quy tắc Đặt tên

Model

- Project
- Task
- Contract

Service

- ProjectService
- TaskService
- ContractService

Controller

- ProjectController
- TaskController
- ContractController

Request

- StoreProjectRequest
- UpdateProjectRequest

Resource

- ProjectResource
- TaskResource
- ContractResource

---

# Quy tắc Cấu trúc Module

Ví dụ module Task:

app/
├── Models/
│   └── Task.php
│
├── Services/
│   └── TaskService.php
│
├── Http/
│   ├── Controllers/
│   │   └── TaskController.php
│   │
│   ├── Requests/
│   │   ├── StoreTaskRequest.php
│   │   └── UpdateTaskRequest.php
│   │
│   └── Resources/
│       └── TaskResource.php

---

# Quy trình làm việc bắt buộc

Trước khi viết code phải thực hiện:

Bước 1:
Phân tích yêu cầu.

Bước 2:
Phân tích database.

Bước 3:
Xác định nghiệp vụ.

Bước 4:
Thiết kế API.

Bước 5:
Đề xuất cấu trúc file.

Bước 6:
Chờ xác nhận.

Bước 7:
Mới được sinh code.

Không được tự động viết code ngay.

---

# Hướng dẫn dành cho AI

Khi tạo backend:

1. Luôn đọc file này trước.
2. Tuân thủ toàn bộ quy tắc trong file.
3. Không đưa business logic vào Controller.
4. Luôn tạo Service.
5. Luôn tạo Form Request.
6. Luôn tạo Resource.
7. Giải thích cấu trúc file trước khi sinh code.
8. Nếu yêu cầu chưa rõ phải hỏi lại.
9. Không tự ý thay đổi kiến trúc dự án.
10. Mọi module mới đều phải tuân thủ đúng cấu trúc:
    Model → Service → Controller → Form Request → Resource.