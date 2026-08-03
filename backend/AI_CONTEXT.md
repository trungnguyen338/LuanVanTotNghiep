# Backend AI Context - Laravel Core & API System

Chào mừng AI Assistant! Đây là tài liệu tóm tắt chi tiết cấu trúc, quy tắc và nghiệp vụ cốt lõi của thư mục **backend** giúp bạn lập tức làm quen và bắt đầu viết code chuẩn xác.

---

## 🚀 1. Công nghệ sử dụng (Tech Stack)
- **Framework:** Laravel 11.x / 13.x (PHP 8.3+)
- **Xác thực (Auth):** Laravel Sanctum (Token-based authentication)
- **Cơ sở dữ liệu:** MySQL (Cấu hình trong `.env`, DB: `LVTNTRUNGNGUYEN`)
- **Coding Standard:** Laravel Pint (Định dạng code tự động)

---

## 📂 2. Cấu trúc thư mục cốt lõi (Core Directory)
- `routes/api.php`: Khai báo toàn bộ các API endpoints của hệ thống.
- `app/Models/`: Chứa các model tương tác cơ sở dữ liệu và định nghĩa quan hệ.
- `app/Http/Controllers/`: Điều hướng request và xử lý logic phản hồi API (trả về kiểu JSON).
- `app/Services/`: Lớp trung gian chứa các nghiệp vụ logic phức tạp (ví dụ: `AuthService.php`, `SubContractService.php`, `TaskDetailService.php`).
- `database/seeders/`: Dữ liệu mẫu ban đầu (ví dụ: `RoleSeeder.php` tạo các quyền cơ bản).

---

## 🛠️ 3. Quy tắc & Cấu hình Đặc thù Database (Crucial Conventions)

Dự án này sử dụng một số cấu hình tùy biến đặc trưng trong Models và tuân thủ nghiêm ngặt sơ đồ ERD mới nhất. **Hãy luôn ghi nhớ khi làm việc với Database và Models:**

### A. Tùy biến thực thể `User` (`app/Models/User.php`)
- **Tên đăng nhập:** Cột `username` được dùng trở lại trên bảng `users` và là một định danh đăng nhập hợp lệ bên cạnh `email`.
  - Khi tạo hoặc cập nhật tài khoản khách hàng, nhà thầu phụ hoặc tài khoản hệ thống, backend tự sinh `username` từ phần local-part của Gmail để người dùng không phải nhập tay.
  - Luồng đăng nhập vẫn tách biệt: hệ thống cho phép đăng nhập bằng `email` hoặc `username` tùy endpoint, còn backend tiếp tục dùng `password_hash` để xác thực.
- **Mật khẩu:** Tên cột lưu mật khẩu đã được đổi từ `password` mặc định thành **`password_hash`**.
  - Hàm `getAuthPasswordName()` trong Model `User` đã được override để trả về `'password_hash'`.
  - Cắt thuộc tính: Cột `password_hash` được khai báo trong `$casts` là `'hashed'`.
- **Thời gian (Timestamps):** Cấu hình `const UPDATED_AT = null;` ở hầu hết các models (chỉ lưu thời gian tạo `created_at`, không tự động lưu/cập nhật `updated_at`).

### B. Chi tiết Cấu trúc DB theo sơ đồ ERD mới và Cơ chế tương thích ngược (Virtual Attributes)
Để đảm bảo đồng bộ hoàn toàn với sơ đồ ERD mới mà không phá vỡ API contract cũ và các tính toán hiện tại, hệ thống định nghĩa các thuộc tính ảo (virtual accessors/mutators):
- **Bảng `roles` / Model `Role`**: Cột `level` đã bị xóa bỏ hoàn toàn.
- **Bảng `customers` / Model `Customer`**: Cột `status` là kiểu số `tinyint` (default 1) lưu trong DB.
- **Bảng `subcontractors` / Model `Subcontractor`**: Cột `status` đổi từ kiểu enum sang `tinyint` (default 1) lưu trong DB.
- **Bảng `client_contracts` / Model `ClientContract`**: Cột `contract_value` đổi tên thành `total_value`. Model vẫn cung cấp accessor/mutator ảo `contract_value` để đồng bộ dữ liệu với `total_value` phục vụ frontend.
- **Bảng `contract_items` / Model `ContractItem`**: 
  - Khóa ngoại đổi tên từ `client_contract_id` sang `contract_id`.
  - Các cột `price` và `description` bị xóa bỏ hoàn toàn khỏi DB, thay bằng `volume` và `unit_price`.
  - Model cung cấp accessor ảo `price` (Thành tiền) bằng trực tiếp `unit_price` (Đơn giá) để đồng bộ hiển thị Thành tiền bằng Đơn giá theo yêu cầu logic mới.
- **Bảng `material_contracts` / Model `MaterialContract`**: Cột `contract_value` đổi tên thành `total_value`. Model cung cấp accessor/mutator ảo `contract_value` trỏ về `total_value`.
- **Bảng `material_contract_items` / Model `MaterialContractItem`**: Cột `quantity` đổi tên thành `quota_quantity`. Model cung cấp accessor/mutator ảo `quantity` trỏ về `quota_quantity` để tương thích với API cũ.
- **Bảng `task_material_usage` / Model `TaskMaterialUsage`**: Cột `quantity_used` đổi tên thành `actual_quantity`.
- **Bảng `project_payment` / Model `ProjectPayment`**: Bảng đổi tên từ số nhiều `project_payments` sang số ít `project_payment`. Thêm cột `payment_code`.
- **Bảng `payment_task_details` / Model `PaymentTaskDetail`**: Cột `paid_amount` đổi tên thành `allocated_amount`. `payment_id` là khóa ngoại bắt buộc trỏ đến `project_payment.id` và `task_detail_id` là khóa ngoại bắt buộc trỏ đến `task_details.id`; cả hai dùng `ON DELETE CASCADE`. Model `ProjectPayment` và `TaskDetail` đều có quan hệ `hasMany` tới các dòng phân bổ, còn `PaymentTaskDetail` có hai quan hệ `belongsTo` tương ứng. Migration tạo constraint sẽ dọn các dòng phân bổ mồ côi legacy trước khi thêm khóa ngoại.
- **Bảng `payment_project_tasks`**: Đã xóa bỏ hoàn toàn khỏi DB.
- **Bảng `project_tasks` / Model `ProjectTask`**: Xóa bỏ các cột `acceptance_status`, `rejection_note`, `approved_by`, `completed_date` và `contract_item_id`. Hạng mục lớn không còn liên kết trực tiếp với hạng mục hợp đồng khách hàng; giá trị hạng mục được xác định bằng `billing_value`.
- **Bảng `construction_logs` / Model `ConstructionLog`**: Xóa bỏ các cột `labor` và `machinery`.
- **Bảng `construction_log_images` / Model `ConstructionLogImage`**: Cột `log_id` là khóa ngoại bắt buộc trỏ đến `construction_logs.id` với `ON DELETE CASCADE`. Khi xóa nhật ký thi công, các bản ghi ảnh liên quan được database tự động xóa; không được tạo ảnh không có nhật ký cha. Migration tạo constraint sẽ dọn các bản ghi ảnh mồ côi legacy trước khi thêm khóa ngoại.
- **Bảng `task_details` / Model `TaskDetail`**: Đã bỏ cột `approved_by`; API nghiệm thu chỉ đồng bộ `acceptance_status` và `rejection_note`, không còn lưu người duyệt riêng trên từng công việc con.
- **Bảng `project_categories` / Model `ProjectCategory`**: Đã bỏ `deleted_at` và ngừng dùng `SoftDeletes`; danh mục dự án là bản ghi thường, không còn cơ chế thùng rác.
- **Bảng `project_documents` / Model `ProjectDocument`**: Đã bỏ `uploader_id`; API tài liệu không còn gắn relation uploader hay lưu người tải lên trong DB.

### C. Cơ chế kiểm tra nghiệm thu hạng mục lớn (Project Tasks)
Do không còn lưu trường trạng thái nghiệm thu trên bảng `project_tasks`, việc kiểm định xem một hạng mục lớn đã phát sinh nghiệm thu thi công hay chưa sẽ truy vấn thông tin gián tiếp qua các công việc con `task_details` đã được duyệt `APPROVED`:
`$task->details()->where('acceptance_status', 'APPROVED')->exists()`

### D. Quan hệ giữa các bảng chính
- `User` thuộc về `Role` (Khóa ngoại: `role_id`).
- `Customer` (Khách hàng / Chủ đầu tư): Quan hệ 1-1 với `User` (Khóa ngoại: `user_id`).
- `Subcontractor` (Nhà thầu phụ): Nhà thầu phụ thực hiện dự án.
- `Project` (Dự án):
  - Khóa ngoại `customer_id` (trỏ đến `customers`). Dự án không còn cột `supervisor_id`, không còn quan hệ người giám sát trực tiếp trong DB.
  - Có các trạng thái (`status`): `DRAFT`, `PENDING`, `PROCESSING`, `REVISION`, `COMPLETED`, `ON_HOLD`.
  - Thuộc tính động được tính toán từ quan hệ:
    - **`budget`**: Tổng ngân sách kế hoạch dự án. Được tính toán bằng: (Tổng `total_value` của các hợp đồng khách hàng gốc thuộc dự án) + (Tổng `value_adjustment` của các phụ lục hợp đồng khách hàng có trạng thái `ACTIVE` của các hợp đồng đó).
    - **`spent_budget`**: Chi phí dự kiến của dự án. Được tính toán bằng tổng giá trị hợp đồng của các hợp đồng thầu phụ (`sub_contracts`) gốc + tổng giá trị của các phụ lục hợp đồng thầu phụ ở trạng thái `Có hiệu lực` thuộc dự án đó.
    - **`progress`**: Tiến độ tổng thể được tính bằng trung bình gia quyền của tiến độ các hạng mục lớn (`progress_percent` của các `project_tasks` nhân với giá trị của hạng mục đó làm trọng số).
      - Trọng số (giá trị hạng mục) là `billing_value` của từng hạng mục lớn; không còn dùng giá trị liên kết từ hạng mục hợp đồng khách hàng.
      - Fallback: Nếu tổng giá trị của các hạng mục bằng 0, tiến độ tổng thể của dự án sẽ bằng trung bình cộng đơn giản của các hạng mục lớn.

### E. Lưu trữ Địa chỉ (Address Field Location)
- **Địa chỉ đối tác:** Cột địa chỉ (`address` dạng `text`) của Khách hàng (`Customer`) và Nhà thầu phụ (`Subcontractor`) được lưu trữ tập trung tại bảng **`users`**.
- **Mô hình Eloquent (Appended Attributes):** Hai model `Customer` và `Subcontractor` khai báo trường `address` trong mảng `$appends` và định nghĩa getter `getAddressAttribute()` để trả về địa chỉ từ quan hệ `user`. Điều này đảm bảo API response của đối tác vẫn có sẵn key `address` ở root level của đối tượng JSON, tránh phá vỡ tích hợp với Frontend React.
- **Username đồng bộ theo Gmail:** Frontend không cần nhập username riêng khi tạo khách hàng hoặc nhà thầu phụ. Backend nhận `email` Gmail hợp lệ, tự sinh `username` từ Gmail và xử lý trùng lặp nếu cần trước khi lưu vào `users`.

### F. Chiến lược Lưu trữ Path Tương đối để phục vụ Vòng đời Sản phẩm (Relative Storage Path Strategy)
Để đảm bảo liên kết tài liệu/hình ảnh không bị lỗi (broken links) trong suốt vòng đời phát triển và triển khai sản phẩm (khi thay đổi tên miền, cổng hoặc giao thức HTTPS giữa các môi trường Local, Staging và Production):
- **Nguyên tắc lưu trữ trong Database:** Tất cả các tệp đính kèm tài liệu (`project_documents.file_path`) và ảnh nhật ký công trình (`construction_log_images.image_url`) **CẤM TUYỆT ĐỐI** lưu trữ đường dẫn tuyệt đối dạng `http://localhost:8000/storage/...`. Hệ thống chỉ lưu trữ đường dẫn tương đối (ví dụ: `documents/filename.png` hoặc `construction_logs/filename.jpg`).
- **Nguyên tắc định dạng URL phản hồi:** Tại Model Eloquent tương ứng (`ProjectDocument` và `ConstructionLogImage`), sử dụng Accessor (`getFileUrlAttribute()` và `getImageUrlAttribute()`) để tự động chuyển đổi path tương đối thành URL đầy đủ dùng hàm `asset('storage/' . $value)` trước khi gửi phản hồi API dạng JSON cho Frontend.
- **Tương thích ngược & Hỗ trợ LAN:** Các Accessor này có cơ chế kiểm tra tự động (`filter_var($value, FILTER_VALIDATE_URL)`). Nếu dữ liệu cũ trong DB đã là URL tuyệt đối, hệ thống sẽ kiểm tra xem nó có chứa `localhost` hoặc `127.0.0.1` hay không; nếu có, hệ thống sẽ tự động bóc tách thành relative path để sinh lại URL động theo host hiện tại của request (giúp ảnh không bị lỗi khi xem trên thiết bị khác trong mạng LAN). Nếu là URL tuyệt đối từ ngoài, nó sẽ trả về trực tiếp để đảm bảo hệ thống không bị vỡ dữ liệu cũ. Đồng thời, model `ConstructionLogImage` được trang bị mutator `setImageUrlAttribute` để tự động làm sạch mọi đường dẫn tuyệt đối thành tương đối trước khi lưu xuống DB.
- **Xóa file vật lý:** Khi xóa tài liệu, Controller sẽ tự động bóc tách đường dẫn tương đối từ URL (nếu lưu dạng URL tuyệt đối cũ) trước khi gọi `Storage::disk('public')->delete($path)` để đảm bảo việc dọn dẹp file vật lý hoạt động chính xác trên mọi môi trường.
- **Xem/tải hồ sơ tài liệu qua API:** Với `ProjectDocument`, Frontend không mở trực tiếp đường dẫn `/storage/...` vì link tĩnh này có thể bị lỗi 403 khi symlink/static server hoặc port/domain thay đổi, đồng thời không đi qua token của Axios. Backend cung cấp endpoint `GET /api/project-documents/{id}/download` trong middleware `auth:sanctum` để stream file từ disk `public`. API response của `ProjectDocument` có thêm `download_url` trỏ tới endpoint này; dữ liệu cũ lưu absolute URL vẫn được endpoint tự bóc tách `/storage/` để phục vụ file.

### G. Quy ước thời gian cho nhật ký thi công (`ConstructionLog`)
- `created_at` của `ConstructionLog` là mốc thời gian thực tế lúc lưu nhật ký.
- Frontend gửi `created_at` theo giờ Việt Nam để phục vụ kiểm tra nghiệp vụ "chỉ được ghi trong ngày hôm nay".
- Khi lưu xuống DB, Backend chuẩn hóa `created_at` về UTC để tránh lệch ngày khi API serialize/deserialize qua các môi trường có timezone khác nhau.
- Khi hiển thị lại ở Frontend, `created_at` vẫn được format theo múi giờ hiện tại của trình duyệt, vì vậy AI phải luôn hiểu đây là timestamp thật chứ không phải ngày tĩnh lấy từ `initialValue` của form.
- `daily_volume` của nhật ký thi công được chuẩn hóa về số thực 2 chữ số thập phân trước khi lưu và trước khi tính lại tiến độ để tránh sai số cache/làm tròn giữa frontend và backend.
- Với các đầu việc được giao lại có hậu tố `- Phần còn lại`, khối lượng hiển thị là khối lượng còn lại của công việc sau lần hủy/giao lại trước đó. Vì vậy con số nhỏ hơn khối lượng gốc không phải là lỗi làm tròn mà là khối lượng thực tế còn được phép thi công.
- Khi `TaskDetail.status` là `CANCELLED` / `'Đã hủy'`, Backend khóa tuyệt đối thao tác thêm, sửa, xóa nhật ký thi công cho công việc đó. Nhật ký cũ vẫn có thể xem để đối chiếu lịch sử, nhưng không được dùng để tiếp tục cập nhật tiến độ sau khi công việc đã hủy hoặc đã chuyển sang quy trình giao lại.

---

## 📄 4. Module Hợp đồng Khách hàng (Client Contracts Module)

Đây là module quản lý các hợp đồng đã ký kết giữa doanh nghiệp và khách hàng (chủ đầu tư), các hạng mục công việc chi tiết và các phụ lục phát sinh.

### A. Thực thể & Models liên quan
- **`ClientContract` (`client_contracts`)**: Lưu trữ thông tin hợp đồng gốc (trường giá trị thực tế `total_value`).
  - Trạng thái (`status`): `DRAFT`, `ACTIVE` (Có hiệu lực), `COMPLETED`, `TERMINATED`.
- **`ContractItem` (`contract_items`)**: Hạng mục công việc chi tiết thuộc hợp đồng.
  - Cột `status` (`VARCHAR(50)`, mặc định `active`) được thêm vào bảng `contract_items` để lưu trạng thái của hạng mục hợp đồng (`active` hoặc `cancelled`).
  - Cho phép thêm, sửa hoặc xóa các hạng mục công việc khi hợp đồng chủ quản đang ở trạng thái **`ACTIVE`** (chỉ chặn khi ở trạng thái **`COMPLETED`** hoặc **`TERMINATED`**).
  - **Tính toán Hạn mức hạng mục:** `Hạn mức = Hợp đồng gốc (total_value) + Tổng phụ lục ACTIVE`. Tổng giá trị các hạng mục `active` không được vượt quá hạn mức này.
  - Hạng mục hợp đồng không còn liên kết trực tiếp với `project_tasks`; việc hủy hạng mục không tự động đổi trạng thái hạng mục lớn trong WBS nữa. Các công việc lớn sử dụng `billing_value` riêng để tính hạn mức và tiến độ.
- **`ContractAddendum` (`contract_addendums`)**: Phụ lục hợp đồng phát sinh.
  - Các trường nghiệp vụ đang dùng: `client_contract_id`, `sub_contract_id`, `addendum_code`, `title`, `value_adjustment`, `signed_date`, `status` (`DRAFT`, `ACTIVE`, `REJECTED`). Hai khóa `client_contract_id` và `sub_contract_id` là khóa ngoại nullable, lần lượt trỏ đến `client_contracts.id` và `sub_contracts.id`, cùng dùng `ON DELETE CASCADE`.
  - Cột legacy `extended_end_date` đã bị xóa khỏi bảng; API và giao diện không còn nhận, lưu hoặc hiển thị trường "Gia hạn thời gian".
- **`ProjectDocument` (`project_documents`)**: Quản lý file đính kèm (hợp đồng gốc, phụ lục). Cột `status` là trạng thái nghiệp vụ/hiển thị (`DRAFT`, `ACTIVE`, `ARCHIVED`), không dùng để khóa thao tác sửa/xóa tài liệu.
  - Liên kết qua bảng pivot `client_contract_documents` hoặc `addendum_documents`.
- **`ProjectPayment` (`project_payment`)**: Các đợt thanh toán doanh thu (`payment_type = 'REVENUE'`) hoặc chi phí (`payment_type = 'COST'`). Bảng này có thêm cột `payment_code`.

### B. Quy tắc Nghiệp vụ Chặt chẽ (Business Rules)
1. **Khởi tạo Hợp đồng gốc:**
   - Mã hợp đồng tự động tăng theo định dạng `HD-xxxx`.
   - Lưu thông tin chung và hỗ trợ đính kèm file (tạo record trong `project_documents` với loại `"Hợp đồng khách hàng"`).
   - Khi lưu thành công, trạng thái hợp đồng mặc định chuyển sang **`ACTIVE`** (Có hiệu lực).
2. **Quy tắc chỉnh sửa:**
   - Khóa các thông tin định danh là **`contract_code`** và **`project_id`**, không cho sửa đổi khi gọi API cập nhật.
   - Khi cập nhật hợp đồng ở trạng thái **`ACTIVE`** hoặc **`COMPLETED`**, tổng giá trị của các hạng mục đang hoạt động (`status = 'active'`) phải bằng đúng giá trị hợp đồng thực tế đã điều chỉnh (`contract_value` mới + `addition_value` - `reduction_value`). Quy tắc này đảm bảo các thay đổi thuộc tính chung không bị chặn bởi các phụ lục tăng/giảm hạn mức hiện có.
3. **Quy tắc quản lý Hạng mục công việc:**
   - Cho phép thêm, sửa hoặc xóa các hạng mục công việc khi hợp đồng chủ quản đang ở trạng thái **`ACTIVE`** (chỉ chặn khi ở trạng thái **`COMPLETED`** hoặc **`TERMINATED`**).
   - **Tính toán Hạn mức hạng mục:** `Hạn mức = Hợp đồng gốc (total_value) + Tổng phụ lục ACTIVE`. Tổng giá trị các hạng mục `active` không được vượt quá hạn mức này.
   - **Tự động hủy công việc cha:** Khi chuyển trạng thái hạng mục sang `cancelled`, hệ thống tự động cập nhật trạng thái của toàn bộ công việc cha (`project_tasks` liên kết trực tiếp với hạng mục) sang `'Đã hủy'` (`CANCELLED`).
4. **Quy tắc xóa Hợp đồng gốc:**
   - Tuyệt đối không cho phép xóa hợp đồng khách hàng nếu hợp đồng đã chuyển sang trạng thái **`ACTIVE`** (hoặc `COMPLETED`, `TERMINATED`).
   - Tuyệt đối không cho phép xóa nếu hợp đồng đã phát sinh đợt thanh toán/thu tiền thực tế từ khách hàng.
   - Chỉ cho phép xóa khi hợp đồng ở trạng thái **`DRAFT`** và chưa phát sinh giao dịch tiền tệ.
5. **Quản lý Phụ lục Phát sinh:**
   - Mã phụ lục tự động tăng theo định dạng `PL-xxxx`.
   - Phải liên kết bắt buộc với một hợp đồng khách hàng gốc (`client_contract_id`).
   - Khóa các trường định danh **`addendum_code`** và **`client_contract_id`** khi cập nhật.
   - Không cho phép xóa phụ lục khi trạng thái là `ACTIVE` / `Có hiệu lực`; frontend phải disable action Xóa và backend trả HTTP 400 nếu request vẫn được gửi.
   - **Tính toán 4 Chỉ số Tài chính:**
     - **Giá trị gốc (original_value):** `total_value` hợp đồng gốc.
     - **Giá trị thêm vào (addition_value):** Tổng `value_adjustment` của các phụ lục `ACTIVE` có giá trị dương (> 0).
     - **Giá trị giảm trừ (reduction_value):** Tổng giá trị các hạng mục hợp đồng bị hủy (`status = 'cancelled'`).
     - **Thực tế cần thu (actual_value):** `original_value` + `addition_value` - `reduction_value`.
     - Giá trị thực tế cần thu (`actual_value`) cũng trực tiếp làm tăng hoặc giảm Ngân sách kế hoạch (`budget`) của Dự án tương ứng.

---

## 📄 5. Module Hợp đồng Nhà thầu phụ (Subcontractor Contracts Module)

Đây là module quản lý các hợp đồng đã ký kết giữa doanh nghiệp và các nhà thầu phụ chịu trách nhiệm thi công.

### A. Thực thể & Models liên quan
- **`SubContract` (`sub_contracts`)**: Lưu trữ thông tin hợp đồng thầu phụ. Cột lưu giá trị hợp đồng trong database là `total_value` (tương đương `contract_value` qua accessor/mutator), và không có cột `contract_name` (được bổ sung qua virtual attribute).
  - Trạng thái (`status`): `DRAFT`, `ACTIVE` (Có hiệu lực), `COMPLETED`, `TERMINATED`.
- **`Subcontractor` (`subcontractors`)**: Nhà thầu phụ thực hiện.
- **DetailContractContractor** (`detail_contract_contractor`): Bảng pivot liên kết hợp đồng với nhà thầu phụ. Hỗ trợ liên kết một hợp đồng thầu phụ với nhiều nhà thầu phụ liên danh. Không sử dụng tỷ lệ chia sẻ phần trăm (đã xóa cột `share_percentage` khỏi database). Vai trò (`role_in_contract`) được xác định động (bản ghi đầu tiên trong liên danh là `MAIN`, các bản ghi còn lại là `MEMBER`).
- **`SubContractAddendum` (`sub_contract_addendums`)**: Phụ lục hợp đồng thầu phụ phát sinh.

### B. Quy tắc Nghiệp vụ Chặt chẽ (Business Rules)
1. **Khởi tạo Hợp đồng thầu phụ:**
   - Mã hợp đồng tự động tăng theo định dạng `HDTP-xxxx`.
   - Sau khi lưu, trạng thái hợp đồng thầu phụ mặc định chuyển sang **`ACTIVE`** (Có hiệu lực).
   - Hỗ trợ liên kết với **một hoặc nhiều nhà thầu phụ** vào bảng `detail_contract_contractor`. Vai trò (`role_in_contract`) được tính tự động (nhà thầu phụ đầu tiên là `'MAIN'`, các nhà thầu phụ khác là `'MEMBER'`). Không cần chỉ định hay kiểm tra tỷ lệ phần trăm phân chia.
2. **Quy tắc chỉnh sửa:**
   - Khóa các thông tin định danh là **`contract_code`** và **`project_id`**, không cho sửa đổi khi gọi API cập nhật.
   - Cho phép thay đổi nhà thầu phụ thực hiện (tự động dọn dẹp liên kết cũ trong `detail_contract_contractor` và chèn liên kết mới).
3. **Tính toán Hạn mức giao việc và 4 Chỉ số Tài chính:**
   - **Hạn mức thầu phụ:** `Hạn mức thầu phụ = Giá trị hợp đồng thầu phụ gốc + Tổng giá trị phụ lục thầu phụ ACTIVE`. Tổng `committed_value` của các công việc giao khoán chi tiết trong cùng hợp đồng thầu phụ không được vượt quá hạn mức này.
   - **Giá trị gốc (original_value):** `total_value` hợp đồng gốc thầu phụ.
   - **Giá trị thêm vào (addition_value):** Tổng `value_adjustment` của các phụ lục thầu phụ `ACTIVE` có giá trị dương (> 0).
   - **Giá trị giảm trừ (reduction_value):** Tổng giá trị của các công việc giao khoán đã hủy hoàn toàn trước đó (trường hợp legacy / `progress_percent < 0`). Với công việc hủy dở dang sau khi đã làm một phần, phần còn lại được xử lý ở cấp `TaskDetail` bằng `remaining_work_volume` và không tự động co nhỏ giá trị hợp đồng thầu phụ.
   - **Thực tế cần chi (actual_value):** `original_value` + `addition_value` - `reduction_value`.
   - Khi nhà thầu phụ bị đuổi hoặc dừng việc, người dùng tạo phụ lục điều chỉnh (giá trị điều chỉnh = 0), chuyển trạng thái công việc giao khoán (`TaskDetail` - subtasks) sang `'CANCELLED'` (Đã hủy). Hệ thống giữ lại phần giá trị/khối lượng đã làm và trả phần còn lại vào `remaining_work_volume` để có thể tạo `TaskDetail` mới giao cho nhà thầu khác. Công việc giao lại là một phân công mới nên luôn khởi tạo `progress_percent = 0`, `status = TODO`, `acceptance_status = NONE`; tuyệt đối không dùng `remaining_work_volume` làm tiến độ.
4. **Quy tắc xóa Hợp đồng gốc:**
   - Tuyệt đối không cho phép xóa hợp đồng nếu hợp đồng đã chuyển sang trạng thái **`ACTIVE`** (hoặc `COMPLETED`, `TERMINATED`).
   - Tuyệt đối không cho phép xóa nếu hợp đồng đã phát sinh thanh toán khối lượng thực tế cho nhà thầu phụ (`project_payments` chứa `sub_contract_id` và `payment_type = 'COST'`).
5. **Quản lý Phụ lục Phát sinh:**
   - Mã phụ lục tự động tăng theo định dạng `PLTP-xxxx`.
   - Phải liên kết bắt buộc với một hợp đồng nhà thầu phụ gốc (`sub_contract_id`).
   - Khóa các trường định danh **`addendum_code`** và **`sub_contract_id`** khi cập nhật.
   - Không cho phép xóa phụ lục khi trạng thái là `ACTIVE` / `Có hiệu lực`; frontend phải disable action Xóa và backend trả HTTP 400 nếu request vẫn được gửi.

---

## 📄 6. Module Hợp đồng Nhà cung cấp Vật tư (Material Supplier Contracts Module)

Đây là module quản lý các hợp đồng mua sắm vật tư thiết bị phục vụ thi công dự án được lập giữa doanh nghiệp và các Nhà cung cấp.

### A. Thực thể & Models liên quan
- **`MaterialContract` (`material_contracts`)**: Lưu trữ thông tin hợp đồng mua vật tư.
  - Trạng thái (`status`): `DRAFT` (Nháp), `ACTIVE` (Có hiệu lực), `COMPLETED` (Hoàn thành), `CANCELLED` (Đã hủy).
- **`MaterialContractItem` (`material_contract_items`)**: Danh mục vật tư chi tiết cần mua.
  - Các trường: `material_contract_id`, `material_name` (tên vật tư), `unit` (đơn vị tính), `quantity` (số lượng), `unit_price` (đơn giá).
- **`Supplier` (`suppliers`)**: Nhà cung cấp liên kết.
- **`ProjectPayment` (`project_payments`)**:    - Khi xóa thành công, hệ thống sẽ tự động dọn dẹp các bản ghi liên quan trong bảng `material_contract_items` và các tài liệu liên kết trong bảng `project_documents`.

---

## 📄 7. Module Phân rã Công việc & Giao khoán (Project Task Breakdown & Subcontractor Assignment)

Module này số hóa sơ đồ phân rã công việc (WBS - Work Breakdown Structure) và hỗ trợ giao khoán công việc cụ thể cho nhà thầu phụ chịu trách nhiệm thi công.

### A. Thực thể & Models liên quan
- **`ProjectTask` (`project_tasks`)**: Hạng mục thi công lớn (hạng mục cha), ví dụ: Phần móng, phần thân, hoàn thiện...
  - Loại hạng mục (`task_type`) lưu và trả về đúng nhãn người dùng chọn: `Thi công trực tiếp` hoặc `Hạng mục kỹ thuật / Thiết kế`. Backend vẫn nhận mã legacy `CONSTRUCTION`/`TECHNICAL` để tương thích request cũ nhưng chuẩn hóa chúng về nhãn trước khi lưu; dữ liệu cũ `Thi công móng`, `Khung kết cấu`, `Hoàn thiện`, `Cơ điện ME` được migration chuyển sang hai nhãn chuẩn.
  - Trạng thái (`status`): `TODO`, `DOING`, `DONE` (cho phép chỉnh sửa thủ công trực tiếp).
  - Nghiệm thu (`acceptance_status`): Đã bãi bỏ tính năng nghiệm thu cấp 2 (luôn ở trạng thái `NONE`).
  - Tiến độ (`progress_percent`): Phần trăm tiến độ của hạng mục lớn (tự động cập nhật dựa trên các công việc con).
  - Cột `work_volume` đã được loại bỏ khỏi bảng `project_tasks`; hạng mục lớn không còn lưu khối lượng riêng. Chỉ `billing_value` được dùng làm giá trị hạng mục và trọng số tài chính.
  - Thuộc tính API động `details_total_value`: Tổng giá trị các công việc con còn được tính vào hạn mức của hạng mục, tính bằng tổng `TaskDetail.committed_value` (công việc đang làm dùng toàn bộ giá trị; công việc đã hủy sau khi đã làm một phần chỉ tính phần giá trị đã thực hiện).
  - Thuộc tính API động `billing_value`: Giá trị khoán của hạng mục lớn. Đây là nguồn giá trị duy nhất của parent task sau khi bỏ `contract_item_id`; frontend và backend đều phải dùng trường này để kiểm tra hạn mức với tổng giá trị công việc con.
- **`TaskDetail` (`task_details`)**: Công việc cụ thể (công việc con) thuộc một hạng mục lớn.
  - Khóa ngoại: `project_task_id` (hạng mục cha), `contractor_detail_id` (trỏ đến bản ghi pivot liên kết hợp đồng nhà thầu phụ trong `detail_contract_contractor`).
  - Các trường: `detail_name` (tên công việc cụ thể), `unit` (đơn vị tính, ví dụ: 'cái', 'bộ', 'm²', 'm³', 'm'), `work_volume` (khối lượng khoán, tối thiểu 0.01), `agreed_price` (đơn giá khoán, tối thiểu 0), `progress_percent` (tiến độ công việc con từ 0 - 100), `status` (lưu vật lý trong DB dưới dạng enum 'Chưa thực hiện', 'Đang thực hiện', 'Đã hoàn thành', 'Tạm dừng', 'Đã hủy', tự động chuyển đổi tương thích với API contract sử dụng 'TODO', 'DOING', 'DONE', 'Tạm dừng', 'CANCELLED'), `acceptance_status` (`NONE`, `PENDING`, `APPROVED`, `REJECTED`).
  - Không còn cột `approved_by`; backend chỉ trả và lưu phần trạng thái nghiệm thu/lý do từ chối, còn thông tin người duyệt không còn nằm trên từng task detail.
  - Thuộc tính API động `total_value`: Thành tiền gốc của công việc con, tính bằng `work_volume * agreed_price`.
  - Thuộc tính API động `committed_value`: Giá trị công việc con còn được tính vào hạn mức/hạch toán. Với công việc đang làm thì bằng `total_value`; với công việc đã hủy sau khi đã làm một phần thì chỉ bằng phần giá trị đã hoàn thành trước khi hủy.
  - Thuộc tính API động `remaining_work_volume` và `remaining_work_value`: Phần khối lượng/giá trị còn lại sau khi hủy để có thể tạo một `TaskDetail` mới giao cho nhà thầu phụ khác. Đây là khối lượng/giá trị, không phải phần trăm tiến độ.
  - Thuộc tính API động `effective_progress_percent`: Tiến độ dùng khi tính bình quân gia quyền cho hạng mục cha. Nếu một `TaskDetail` bị hủy sau khi đã làm một phần, phần đã làm vẫn được tính là 100% của `committed_value` để hạng mục cha giữ đúng tiến độ tổng thể.

### B. Quy tắc Nghiệp vụ Chặt chẽ (Business Rules)
1. **Khởi tạo và Phân cấp Công việc:**
   - Admin tạo hạng mục lớn (parent task) trực thuộc dự án. Tiến độ mặc định = 0%, trạng thái mặc định = `TODO`.
   - Admin tiếp tục tạo các công việc chi tiết (child task) bên trong hạng mục lớn và lựa chọn nhà thầu phụ (thông qua liên kết hợp đồng thầu phụ `contractor_detail_id`) kèm khối lượng và đơn giá khoán.
2. **Tính toán tiến độ tự động (Weighted Average Progress):**
   - Mỗi khi một công việc con được tạo, cập nhật hoặc xóa, hệ thống sẽ tự động tính toán lại tiến độ `progress_percent` của hạng mục cha.
   - **Công thức tính theo giá trị hoàn thành trên phạm vi công việc:**
     $$\text{Tiến độ hạng mục cha} = \frac{\sum \text{Giá trị đã hoàn thành của công việc con}}{\sum \text{Giá trị phạm vi công việc con}} \times 100$$
   - Với công việc con đang thực hiện, `Giá trị đã hoàn thành = total_value * progress_percent / 100` và `Giá trị phạm vi = total_value`.
   - Với công việc con bị hủy dở dang, `Giá trị đã hoàn thành = committed_value`. Nếu chưa tạo task giao lại thì phạm vi vẫn là `total_value` để tiến độ giữ đúng phần đã làm (ví dụ làm 50/100 thì hạng mục là 50%, không phải 100%). Nếu đã có task mới tên `Tên gốc - Phần còn lại`, task gốc chỉ giữ phạm vi bằng `committed_value`, còn phần còn lại do task mới đại diện để tránh đếm đôi.
   - **Trường hợp Fallback:** Nếu tổng giá trị khoán của tất cả các công việc con bằng 0 (ví dụ đơn giá khoán đều bằng 0), hệ thống tự động tính theo trung bình cộng đơn giản của các công việc con:
     $$\text{Tiến độ hạng mục cha} = \text{Average}(\text{Tiến độ các công việc con})$$
   - Hạng mục cha tự động cập nhật trạng thái (`status`): `DONE` khi toàn bộ công việc con đều `DONE`, đã được nghiệm thu (`acceptance_status = 'APPROVED'`) và tiến độ đạt 100%; các trường hợp còn lại có công việc con sẽ là `DOING`; chỉ khi chưa có công việc con nào mới là `TODO`.
3. **Ràng buộc giá trị công việc con theo giá trị hạng mục:**
   - Giá trị hạng mục hiệu lực lấy từ `project_tasks.billing_value`; nếu giá trị này rỗng hoặc bằng 0 thì giá trị hạng mục được xem là 0 để tránh phụ thuộc vào hạng mục hợp đồng khách hàng cũ.
   - Form tạo/sửa hạng mục lớn không còn trường `contract_item_id`; backend chỉ kiểm tra `billing_value` và chặn giảm giá trị xuống thấp hơn tổng `details_total_value` hiện có.
   - Khi tạo hoặc cập nhật `TaskDetail`, hệ thống chặn nếu tổng `committed_value` của các công việc con trong cùng hạng mục vượt quá giá trị hạng mục hiệu lực.
   - Khi tạo mới `TaskDetail` qua API, backend luôn chuẩn hóa tiến độ/trạng thái ban đầu về `progress_percent = 0`, `status = TODO`, `acceptance_status = NONE`, kể cả khi payload frontend vô tình gửi kèm giá trị tiến độ cũ.
   - Khi cập nhật `ProjectTask`, hệ thống chặn giảm `billing_value` hoặc đổi liên kết làm giá trị hạng mục hiệu lực nhỏ hơn tổng `details_total_value` hiện có.
   - Công việc con có trạng thái `CANCELLED` vẫn có thể đóng góp một phần `committed_value` nếu đã làm dở dang trước khi hủy; phần còn lại được trả về `remaining_work_volume` để tạo công việc giao khoán mới.
   - API lấy danh sách/chi tiết `ProjectTask` sẽ gọi tính lại tiến độ trước khi trả response để các dữ liệu cũ đã lưu sai tiến độ được đồng bộ lại khi người dùng refresh màn hình.
4. **Quy tắc chặn sửa/xóa & Khóa dữ liệu thi công:**
   - Tuyệt đối không cho phép xóa hạng mục lớn (parent task) nếu bên trong nó vẫn còn các công việc con chi tiết (chặn xóa và yêu cầu xóa hết công việc con trước).
   - Đối với công việc con, nếu đã được duyệt nghiệm thu hoàn thành (`acceptance_status = 'APPROVED'`), hệ thống sẽ chặn cập nhật hoặc xóa công việc con đó.
   - Khi hạng mục cha đã hoàn thành (`status = 'DONE'`), toàn bộ dữ liệu nhật ký thi công (`construction_logs`) thuộc các công việc con thuộc hạng mục này sẽ bị khóa hoàn toàn (không cho phép thêm mới, chỉnh sửa hoặc xóa nhật ký).
5. **Ràng buộc giao việc cho nhà thầu phụ (Subcontractor availability lock):**
   - Khi giao khoán một công việc mới cho nhà thầu phụ, hệ thống sẽ kiểm tra xem nhà thầu phụ đó có đang thực hiện bất kỳ công việc nào chưa hoàn thành (tiến độ < 100%) hay không (loại trừ các công việc giao khoán đã bị hủy `status = 'Đã hủy'`). Nếu có, hệ thống sẽ chặn giao việc mới cho nhà thầu phụ này (trả về lỗi HTTP status 400).
6. **Ràng buộc ngày kết thúc dự kiến (Future expected end date):**
   - Khi thêm mới hoặc chỉnh sửa ngày kết thúc dự kiến (`end_date`) của công việc con, hệ thống bắt buộc kiểm tra xem ngày này có thuộc về ngày hôm nay hoặc tương lai (không được là ngày quá khứ). Ràng buộc này chỉ kích hoạt khi tạo mới hoặc khi ngày kết thúc dự kiến được sửa sang một giá trị mới.
7. **Tự động đồng bộ Tiến độ, Trạng thái và Nghiệm thu công việc con (TaskDetail):**
   - Khi lưu một công việc con (`TaskDetail`), hệ thống tự động kiểm tra và đồng bộ trạng thái, tiến độ và trạng thái nghiệm thu:
     - Nếu đã được duyệt nghiệm thu hoàn thành (`acceptance_status = 'APPROVED'`), tiến độ `progress_percent` tự động gán là `100` và trạng thái `status` tự động chuyển thành `DONE`.
     - Nếu tiến độ đạt `100%`, trạng thái `status` tự động đồng bộ thành `DONE`.
     - Nếu tiến độ lớn hơn `0%` và nhỏ hơn `100%`, và trạng thái hiện tại là `TODO` hoặc `DONE`, trạng thái tự động chuyển thành `DOING` (Đang thực hiện).
     - Nếu tiến độ bằng `0%`, và trạng thái hiện tại là `DOING` hoặc `DONE`, trạng thái tự động chuyển thành `TODO` (Chưa thực hiện).
     - Nếu tiến độ nhỏ hơn `100%`, trạng thái nghiệm thu (`acceptance_status`) tự động reset về `NONE`.
     - Nếu cập nhật trạng thái `status` là `CANCELLED`, hệ thống giữ lại tiến độ thực tế đã làm, lưu raw status là `'Đã hủy'` và đồng thời tính `remaining_work_volume` / `remaining_work_value` để có thể giao phần việc còn lại cho nhà thầu khác.

---

## 📄 8. Module Quản lý Hồ sơ tài liệu (Project Document Management Module)

Module này số hóa, lưu trữ tập trung và phục vụ tra cứu nhanh các văn bản, hồ sơ (bản vẽ thiết kế, giấy phép xây dựng, biên bản bàn giao...) liên quan của dự án.

### A. Thực thể & Models liên quan
- **`ProjectDocument` (`project_documents`)**: Bản ghi thông tin tài liệu.
  - Các trường: `project_id`, `document_name`, `document_type_id`, `file_url`, `status` (`DRAFT`, `ACTIVE`, `ARCHIVED`).
  - Không còn cột `uploaded_by` hay relation `uploader`; API tài liệu chỉ trả metadata file, dự án, loại tài liệu và `download_url`.
- **`DocumentType` (`document_types`)**: Danh mục phân loại tài liệu (Bản vẽ thiết kế, Giấy phép xây dựng, Biên bản bàn giao, Tài liệu hành chính, Biên bản nghiệm thu, Khác...).
  - Loại tài liệu cũ **`Hợp đồng nhà cung cấp`** đã ngưng sử dụng sau khi module hợp đồng vật tư/nhà cung cấp bị loại bỏ. Không xóa cứng bản ghi khỏi DB vì có thể còn tài liệu cũ tham chiếu, nhưng API `GET /api/document-types` sẽ ẩn loại này và API upload/chỉnh sửa không cho chọn loại này cho tài liệu mới.
- **Pivot Tables**:
  - Hợp đồng khách hàng: `client_contract_documents`.
  - Phụ lục hợp đồng khách hàng: `addendum_documents`.
  - Hợp đồng thầu phụ: `sub_contract_documents`.
  - Hợp đồng vật tư: `material_contract_documents`.
  - Nghiệm thu thực tế/Thanh toán: `payment_documents` và `task_documents`.

### B. Quy tắc Nghiệp vụ Chặt chẽ (Business Rules)
1. **Lưu trữ tài liệu và Tải lên File:**
   - Hỗ trợ tải lên một file (trường `file`/`document_file`) hoặc tải lên nhiều file cùng lúc (trường `files[]`/`document_files[]` dạng mảng, tạo ra nhiều bản ghi tài liệu tương ứng). Định dạng được hỗ trợ bao gồm PDF, Word, Excel, ZIP, Hình ảnh với kích thước tối đa 20MB cho mỗi tệp tin trên toàn bộ luồng hồ sơ tài liệu, hợp đồng khách hàng, hợp đồng thầu phụ và phụ lục. Sau khi lưu, các tài liệu lập tức có hiệu lực (`ACTIVE`). Khi tải lên nhiều file cùng lúc, tên gọi tài liệu sẽ được tự động đính kèm tên file gốc để dễ phân biệt, ví dụ: `[Tên tài liệu] ([tên_file_gốc].[phần_mở_rộng])`.
   - File mới phải lưu `project_documents.file_path` ở dạng path tương đối (ví dụ `documents/abc.pdf`). Không lưu `http://localhost:8000/storage/...` vào DB.
   - Xem/tải file dùng endpoint `GET /api/project-documents/{id}/download`; endpoint trả file qua `Storage::disk('public')->download(...)`, xử lý được cả path tương đối và dữ liệu cũ dạng URL tuyệt đối.
2. **Quy tắc chỉnh sửa và xóa:**
   - Hệ thống cho phép cập nhật thông tin tài liệu bình thường, không phụ thuộc vào `project_documents.status`.
   - Không cho phép xóa tài liệu thuộc các phân loại hợp đồng quan trọng: `Hợp đồng khách hàng`, `Hợp đồng thầu phụ`/`Hợp đồng nhà thầu phụ`, `Phụ lục hợp đồng`.
   - Không cho phép đổi phân loại của tài liệu đang thuộc nhóm hợp đồng/phụ lục, để tránh lách rule bảo vệ xóa. Rule này chỉ dựa trên phân loại hiện tại, không dựa trên `documentable_type`.
   - Trạng thái nghiệp vụ `status` vẫn được phép cập nhật qua endpoint chuyên biệt `PATCH /api/project-documents/{id}/status`.
3. **Cấu hình phục vụ file tĩnh và Xử lý lỗi 403 Forbidden (Troubleshooting):**
   - Hệ thống phục vụ file công khai từ ổ đĩa `public` thông qua symbolic link `public/storage -> storage/app/public`.
   - **Lưu ý đặc biệt về Laravel 11:** Mặc định trong cấu hình `config/filesystems.php`, đĩa `local` không được kích hoạt `'serve' => true`. Nếu bật `'serve' => true` cho đĩa `local`, Laravel sẽ đăng ký route `storage/{path}` tự động để phục vụ file từ đĩa local. Việc này gây xung đột trực tiếp với symbolic link `/storage` của đĩa `public`. Khi có một tệp tin công cộng không tồn tại trên đĩa, máy chủ Web (hoặc PHP Built-in Server) sẽ đẩy request về `index.php`, khớp với route `storage/{path}` của đĩa `local`, và vì thiếu chữ ký URL hợp lệ (signed URL), Laravel sẽ trả về mã lỗi **403 Forbidden** thay vì **404 Not Found** đúng nghĩa.
   - **Giải pháp:** Phải đảm bảo đặt `'serve' => false` (hoặc xóa cấu hình này) trong cấu hình đĩa `local` ở `config/filesystems.php` để hệ thống trả lỗi **404 Not Found** chính xác đối với các tệp tin không tồn tại.

---

## 📄 8b. Module Quản lý Phiếu thu & Chi (Project Payments Module)

Module này chịu trách nhiệm ghi nhận các dòng tiền thực tế thu về từ Khách hàng (Phiếu thu / Doanh thu) hoặc chi trả cho các thầu phụ (Phiếu chi / Chi phí).

### A. Thực thể & Models liên quan
- **`ProjectPayment` (`project_payment`)**: Lưu trữ thông tin từng đợt thanh toán/thu tiền.
  - Các trường: `client_contract_id` (cho phiếu thu), `sub_contract_id` (cho phiếu chi), `payment_code` (mã tự tăng dạng `PAY-xxxxx`), `payment_type` (`THU` hoặc `CHI`), `title`, `amount` (số tiền thực tế), `payment_date` (ngày thanh toán), `status` (`Chờ duyệt`, `Đã giải ngân`).
- **`PaymentTaskDetail` (`payment_task_details`)**: Lưu trữ chi tiết phân bổ thanh toán cho từng công việc con của thầu phụ.
  - Các trường: `payment_id`, `task_detail_id`, `allocated_amount` (số tiền thực chi cho công việc này).

### B. Quy tắc Nghiệp vụ Chặt chẽ (Business Rules)
1. **Khởi tạo và mặc định trạng thái:**
   - Khi Admin lập một Phiếu thu mới (`payment_type = 'REVENUE' / 'THU'`) ghi nhận dòng tiền khách hàng gửi về, trạng thái mặc định của phiếu thu được thiết lập ngay là `COMPLETED` (`Đã giải ngân`).
   - Khi Admin lập một Phiếu chi mới (`payment_type = 'COST' / 'CHI'`), trạng thái mặc định của phiếu chi được thiết lập là `PENDING` (`Chờ duyệt`).
2. **Tự động tính toán các Chỉ số Tài chính liên quan:**
   - **Doanh thu lũy kế của Dự án (`received_budget`):** Bằng tổng `amount` của các phiếu thu (`payment_type = 'THU'`) có trạng thái `COMPLETED` (`Đã giải ngân`) thuộc các hợp đồng khách hàng của dự án đó.
   - **Chi phí dự kiến của Dự án (`spent_budget`):** Bằng tổng giá trị hợp đồng của các hợp đồng thầu phụ (`sub_contracts`) gốc + tổng giá trị của các phụ lục hợp đồng thầu phụ ở trạng thái `Có hiệu lực` thuộc dự án đó.
   - **Số tiền đã thu của Hợp đồng (`received_amount`):** Bằng tổng `amount` của các phiếu thu có trạng thái `COMPLETED` (`Đã giải ngân`) của hợp đồng khách hàng tương ứng.
   - **Số tiền còn phải thu của Hợp đồng (`remaining_amount`):** Bằng giá trị thực tế hợp đồng (`actual_value`) trừ đi số tiền đã thu (`received_amount`).
   - **Số tiền đã thanh toán cho công việc thầu phụ (`paid_amount`):** Tổng `allocated_amount` từ các phiếu chi đã giải ngân (`status = 'Đã giải ngân'`) phân bổ cho công việc đó.
   - **Số tiền còn lại của công việc thầu phụ (`remaining_amount`):** Giá trị khoán (`work_volume * agreed_price`) trừ đi số tiền đã thanh toán (`paid_amount`).
3. **Ràng buộc kiểm soát dòng tiền chặt chẽ (Financial Controls):**
   - **Với Phiếu Thu:** Khi tạo mới hoặc cập nhật một phiếu thu ở trạng thái `COMPLETED` (`Đã giải ngân`), hệ thống kiểm tra: Tổng số tiền đã thu (`amount` mới + tổng các phiếu thu `COMPLETED` cũ khác của hợp đồng) **tuyệt đối không được vượt quá** giá trị thực tế của hợp đồng (`actual_value`). Nếu vượt quá, trả về lỗi HTTP 400.
   - **Chặn Phiếu Chi cho hợp đồng thầu phụ đã hủy:** Khi tạo Phiếu chi (`payment_type = 'COST' / 'CHI'`) có `sub_contract_id`, backend kiểm tra trạng thái Hợp đồng thầu phụ trước khi xử lý phân bổ. Nếu hợp đồng đã bị hủy/chấm dứt (`TERMINATED`, `CANCELLED` hoặc raw status `Bị hủy`), API trả về HTTP 400 và không tạo phiếu chi mới. Endpoint lấy danh sách công việc đủ điều kiện giải ngân `GET /api/sub-contracts/{id}/eligible-tasks` cũng trả HTTP 400 với hợp đồng đã hủy để khóa toàn bộ flow lập phiếu chi.
   - **Với Phiếu Chi liên kết Hợp đồng thầu phụ:** Bắt buộc phải chọn phân bổ chi trả cho các công việc con đã hoàn thành và được phê duyệt nghiệm thu (`status = DONE`, `acceptance_status = APPROVED`) thuộc hợp đồng đó. Tổng tiền phân bổ phải bằng số tiền ghi trên phiếu chi. Số tiền phân bổ cho mỗi công việc không được vượt quá số tiền còn lại chưa thanh toán (`remaining_amount`) của công việc đó. Nếu không thỏa mãn các điều kiện trên, hệ thống sẽ trả về lỗi HTTP 400 và chặn lưu.
   - **Ngăn chặn xóa phiếu thanh toán đã giải ngân:** Hệ thống tuyệt đối chặn hành động xóa đối với cả Phiếu thu và Phiếu chi có trạng thái `Đã giải ngân` (`COMPLETED`). Nếu thực hiện xóa, API trả về mã lỗi HTTP 400 và chặn thao tác.
   - **Tự động hoàn thành hợp đồng sau thanh toán đủ:** Sau khi tạo mới hoặc cập nhật một phiếu thanh toán sang trạng thái `COMPLETED` (`Đã giải ngân`), backend sẽ gọi `syncCompletionStatus()` trên hợp đồng liên quan. Nếu Phiếu thu làm `ClientContract.remaining_amount <= 10` hoặc Phiếu chi làm `SubContract.remaining_amount <= 10`, hợp đồng tự chuyển `status = COMPLETED` (`Đã thanh lý`). Luồng này chạy trước khi kiểm tra `Project::checkAutoCompletion()` để đảm bảo dự án hoàn thành chỉ khi các hợp đồng đã được tất toán đúng trạng thái.
4. **Thống kê và Biểu đồ trên Dashboard:**
   - **Tổng doanh thu (total_revenue):** Tổng số tiền `amount` của toàn bộ các phiếu thu (`payment_type = 'THU'`) có trạng thái `COMPLETED` (`Đã giải ngân`) trong hệ thống.
   - **Tổng chi phí (total_costs):** Tổng số tiền `amount` của toàn bộ các phiếu chi (`payment_type = 'CHI'`) có trạng thái `COMPLETED` (`Đã giải ngân`) trong hệ thống.
   - **Biểu đồ Doanh thu & Chi phí 6 tháng gần nhất (monthly_data):** Tính tổng thực thu (`THU`) và thực chi (`CHI`) đã giải ngân của từng tháng dựa theo thuộc tính ngày thanh toán thực tế (`payment_date`) trong bảng `ProjectPayment`.

---

## 🌐 9. Các API Endpoints chính

### A. Hợp đồng Khách hàng & Hạng mục
- **Hợp đồng gốc:**
  - `GET /api/client-contracts`: Danh sách hợp đồng.
  - `GET /api/client-contracts/{id}`: Chi tiết hợp đồng (kèm items, addendums, documents).
  - `POST /api/client-contracts`: Tạo hợp đồng.
  - `PUT /api/client-contracts/{id}`: Cập nhật thông tin chung.
  - `DELETE /api/client-contracts/{id}`: Xóa hợp đồng nháp.
- **Hạng mục công việc:**
  - `GET /api/client-contracts/{contract}/items`: Danh sách hạng mục.
  - `POST /api/client-contracts/{contract}/items`: Thêm hạng mục.
  - `PUT /api/contract-items/{id}`: Cập nhật hạng mục.
  - `DELETE /api/contract-items/{id}`: Xóa hạng mục.
- **Phụ lục hợp đồng:**
  - `GET /api/client-contracts/{contract}/addendums`: Danh sách phụ lục.
  - `POST /api/client-contracts/{contract}/addendums`: Tạo phụ lục.
  - `GET /api/contract-addendums/{id}`: Chi tiết phụ lục.
  - `PUT /api/contract-addendums/{id}`: Cập nhật phụ lục.
  - `DELETE /api/contract-addendums/{id}`: Xóa phụ lục.

### B. Hợp đồng Nhà thầu phụ & Phụ lục thầu phụ
- **Hợp đồng gốc:**
  - `GET /api/sub-contracts`: Danh sách hợp đồng.
  - `GET /api/sub-contracts/{id}`: Chi tiết hợp đồng.
  - `POST /api/sub-contracts`: Lập hợp đồng thầu phụ mới.
  - `PUT /api/sub-contracts/{id}`: Cập nhật thông tin chung và phân chia lại thầu phụ.
  - `DELETE /api/sub-contracts/{id}`: Xóa hợp đồng nháp.
- **Phụ lục hợp đồng thầu phụ:**
  - `GET /api/sub-contracts/{sub_contract}/addendums`: Danh sách phụ lục.
  - `POST /api/sub-contracts/{sub_contract}/addendums`: Tạo phụ lục mới.
  - `GET /api/sub-contract-addendums/{id}`: Chi tiết phụ lục.
  - `PUT /api/sub-contract-addendums/{id}`: Cập nhật phụ lục.
  - `DELETE /api/sub-contract-addendums/{id}`: Xóa phụ lục.

### C. Hợp đồng Nhà cung cấp Vật tư
- `GET /api/material-contracts`: Danh sách hợp đồng vật tư (hỗ trợ filter `project_id`, `supplier_id`, `status` và `search`).
- `GET /api/material-contracts/{id}`: Chi tiết hợp đồng (kèm project, supplier, items, documents, payments).
- `POST /api/material-contracts`: Lập hợp đồng mua vật tư mới (tự sinh mã `HDVT-xxxx`, tạo chi tiết vật tư, upload file tài liệu).
- `PUT /api/material-contracts/{id}`: Cập nhật hợp đồng và danh mục vật tư. Nếu đang ở trạng thái `DRAFT`, được phép chỉnh sửa toàn bộ. Nếu đang ở trạng thái khác `DRAFT` (ví dụ `ACTIVE`), chỉ cho phép thay đổi duy nhất trường `status` (như chuyển sang `COMPLETED` hoặc `CANCELLED`) và tự động khóa các thông tin khác.
- `DELETE /api/material-contracts/{id}`: Xóa hợp đồng nháp chưa thanh toán.

### D. Phân rã Công việc & Giao khoán
- **Hạng mục lớn (Parent Tasks):**
  - `GET /api/projects/{project}/tasks`: Lấy danh sách hạng mục lớn của dự án.
  - `POST /api/projects/{project}/tasks`: Lập hạng mục thi công lớn mới.
  - `PUT /api/project-tasks/{id}`: Cập nhật thông tin hạng mục lớn.
  - `DELETE /api/project-tasks/{id}`: Xóa hạng mục lớn (thành công nếu không có công việc con).
- **Công việc con & Giao khoán (Sub-tasks / Task Details):**
  - `GET /api/project-tasks/{task}/details`: Lấy danh sách công việc con thuộc hạng mục lớn.
  - `GET /api/task-details`: Lấy danh sách tất cả các công việc con có yêu cầu nghiệm thu (Admin).
  - `POST /api/project-tasks/{task}/details`: Tạo công việc con mới và giao khoán cho nhà thầu phụ.
  - `POST /api/task-details/{id}/request-acceptance`: Gửi yêu cầu nghiệm thu khi đạt 100% (Nhà thầu phụ).
  - `PUT /api/task-details/{id}`: Cập nhật tiến độ, trạng thái và nghiệm thu công việc con (Admin duyệt hoặc từ chối).
  - `DELETE /api/task-details/{id}`: Xóa công việc con (tự động tính lại tiến độ hạng mục cha).

### E. Quản lý Hồ sơ tài liệu (Project Documents)
- `GET /api/document-types`: Lấy danh sách các loại tài liệu phân loại trong hệ thống.
- `GET /api/project-documents`: Danh sách tài liệu dự án (hỗ trợ lọc `project_id`, `document_type_id` và tìm kiếm `search` theo tên).
- `POST /api/project-documents`: Tải lên hồ sơ tài liệu mới đính kèm tệp tin.
- `PUT /api/project-documents/{id}`: Cập nhật thông tin tài liệu khi tài liệu ở trạng thái `DRAFT` (sẽ bị từ chối với lỗi 400 nếu tài liệu là `ACTIVE` hoặc `ARCHIVED`).
- `DELETE /api/project-documents/{id}`: Xóa tài liệu khỏi hệ thống khi tài liệu ở trạng thái `DRAFT` (sẽ bị từ chối với lỗi 400 nếu tài liệu là `ACTIVE` hoặc `ARCHIVED`).

### F. Quản lý Phiếu thanh toán (Project Payments)
- `GET /api/project-payments`: Danh sách phiếu thu/chi (hỗ trợ lọc `payment_type`, `client_contract_id`, `sub_contract_id`, `status` và `project_id`).
- `GET /api/project-payments/{id}`: Chi tiết phiếu thanh toán.
- `POST /api/project-payments`: Tạo phiếu thanh toán mới (tự sinh mã `PAY-xxxxx`, mặc định trạng thái `COMPLETED` cho phiếu thu `REVENUE`).
- `PUT /api/project-payments/{id}`: Cập nhật thông tin phiếu thanh toán.
- `DELETE /api/project-payments/{id}`: Xóa phiếu thanh toán khỏi hệ thống.

### G. Cổng Khách hàng (Customer Portal)
- `GET /api/customer/projects`: Lấy toàn bộ danh sách các dự án thuộc về Khách hàng đang đăng nhập, kèm theo đầy đủ thông tin chi tiết về ngân sách (`budget`), tiến độ tổng thể (`progress`), khối lượng thu chi lũy kế, hình ảnh nhật ký thi công (`logs.images`), và hồ sơ tài liệu (`documents`).

---

## 📄 9b. Module Nhật ký thi công thầu phụ (Subcontractor Construction Diary Module)

Module này cho phép Nhà thầu phụ ghi nhận khối lượng thi công thực tế đạt được hàng ngày và tự động tính toán tiến độ cộng dồn cho công việc con (TaskDetail) cũng như hạng mục cha (ProjectTask).

### A. Thực thể & Models liên quan
- **`ConstructionLog` (`construction_logs`)**: Lưu trữ nhật ký thi công hàng ngày. Đã loại bỏ các cột `labor` (nhân lực) và `machinery` (máy móc) theo ERD mới nhất.
- **`ConstructionLogImage` (`construction_log_images`)**: Lưu trữ các hình ảnh minh chứng hiện trường đính kèm theo nhật ký.
  - Khi chỉnh sửa nhật ký, payload `remove_image_ids[]` dùng để xóa các ảnh cũ bị bỏ khỏi giao diện; Backend đồng thời xóa bản ghi và file vật lý trong disk `public`.

### B. Quy tắc Nghiệp vụ Chặt chẽ (Business Rules)
1. **Quy tắc thời gian cập nhật:**
   - Nhật ký thi công mới chỉ cho phép nhập (POST) trong ngày hôm nay.
   - Nhật ký đã ghi có thể chỉnh sửa (PUT) hoặc xóa (DELETE) kể cả khi được tạo từ ngày trước, miễn là công việc vẫn đang mở và chưa bị khóa bởi nghiệm thu, hủy hoặc hoàn thành.
2. **Quy tắc tính toán cộng dồn tiến độ (Cumulative Progress Calculation):**
   - Tổng khối lượng thi công lũy kế bằng tổng cột `daily_volume` của tất cả các bản ghi nhật ký thuộc công việc con (`task_detail_id`).
   - Phần trăm tiến độ hoàn thành được tính bằng: `(Tổng khối lượng lũy kế) / (Khối lượng giao khoán của công việc - work_volume) * 100` (giới hạn tối đa 100%).
   - Hệ thống tự động cập nhật trạng thái (`status`) của công việc con: `DONE` nếu tiến độ đạt 100%, `DOING` nếu tiến độ > 0%, và `TODO` nếu tiến độ = 0%.
   - Kích hoạt tính toán lại tiến độ bình quân gia quyền của Hạng mục lớn (Parent Task) tương ứng.
3. **Ràng buộc gửi yêu cầu nghiệm thu:**
   - Hệ thống tuyệt đối khóa tính năng gửi yêu cầu nghiệm thu (Acceptance Request) nếu tiến độ cộng dồn chưa đạt đúng 100%.
   - Khi tiến độ đạt 100%, hệ thống mở khóa cho phép Nhà thầu phụ gửi yêu cầu nghiệm thu (`acceptance_status` chuyển sang `PENDING`).
4. **Khóa ghi/sửa nhật ký khi đang nghiệm thu:**
   - Tuyệt đối khóa tính năng Thêm, Sửa hoặc Xóa nhật ký thi công nếu công việc con đó đang ở trạng thái nghiệm thu là `PENDING` (Chờ duyệt) hoặc `APPROVED` (Đã duyệt hoàn thành) (HTTP 400).
5. **Đồng bộ Khối lượng lũy kế hiển thị của thầu phụ:**
   - Để tránh việc khối lượng lũy kế đã làm hiển thị là `0.0` trong khi tiến độ đạt `100%` (khi thầu phụ chưa ghi nhật ký nhưng tiến độ đã được cập nhật thủ công), API lấy danh sách công việc thầu phụ (`myTasks` / `getSubcontractorTasks`) tự động tính toán khối lượng lũy kế bằng giá trị lớn nhất giữa: Tổng khối lượng từ nhật ký thi công thực tế và Khối lượng tính toán tương đối theo phần trăm tiến độ hiện tại (`progress_percent / 100 * work_volume`).

---

## 🔐 10. Luồng xác thực & Phân quyền (Authentication & Roles)

Hệ thống xác thực qua **Laravel Sanctum** token-based. Được chia làm hai cổng login:
1. **Admin / Cổng nội bộ:** POST `/api/auth/admin/login`
   - Dành cho Quản trị viên và Nhà thầu phụ.
   - Tài khoản có Role tên là `'Khách hàng'` sẽ bị từ chối truy cập cổng này.
2. **Khách hàng (Customer Portal):** POST `/api/auth/customer/login`
   - Dành riêng cho khách hàng đăng nhập cổng Portal để theo dõi tiến độ.
   - Chỉ tài khoản có Role là `'Khách hàng'` mới được phép đăng nhập.
3. **Đổi mật khẩu tài khoản:** POST `/api/auth/change-password`
   - Dành cho bất kỳ người dùng đã đăng nhập (Sanctum auth).
   - Tham số đầu vào:
     - `current_password` (string, bắt buộc): Mật khẩu hiện tại của người dùng.
     - `new_password` (string, bắt buộc, tối thiểu 6 ký tự): Mật khẩu mới cần thiết lập.
     - `new_password_confirmation` (string, bắt buộc): Xác nhận lại mật khẩu mới (phải trùng khớp hoàn toàn với `new_password`).
   - Phản hồi thành công: HTTP status `200` kèm JSON `{"message": "Đổi mật khẩu thành công."}`.
   - Phản hồi thất bại: HTTP status `422` nếu lỗi validation hoặc mật khẩu hiện tại không chính xác.

---

## 🧑‍💼 11. Quản lý tài khoản (Account Management)
- **Quản lý tài khoản:** Được chuyển đổi từ module Quản lý nhân sự (HR). Mục đích chính là giúp Quản trị viên quản lý các tài khoản đăng nhập của Khách hàng và Nhà thầu phụ (hỗ trợ đặt lại mật khẩu mới khi họ quên).
- **Lọc vai trò:** Danh sách tài khoản hiển thị và dropdown lựa chọn vai trò chỉ hiển thị hai vai trò là `Khách hàng` và `Nhà thầu phụ`. Các vai trò nội bộ cũ (`Giám sát`, `Kỹ sư`, `Kế toán`) đã bị loại bỏ hoàn toàn khỏi hệ thống.
- **Giám sát dự án:** Chức năng giám sát dự án đã được bỏ khỏi bảng `projects`; nếu cần lưu người phụ trách thì phải xử lý ở layer nghiệp vụ khác, không còn dựa vào cột `supervisor_id`.
- **Đồng bộ mã đối tác:** Mã khách hàng (`customer_code` dạng `CUS-XXXX`) và mã nhà thầu phụ (`subcontractor_code` dạng `SUB-XXXX`) được sinh tự động đồng bộ chính xác với `id` tự tăng của bản ghi đó trong cơ sở dữ liệu để đảm bảo không bị trùng lặp hoặc lệch số khi có bản ghi bị xóa.
- **Ràng buộc Email (Validation):** Tất cả email khi tạo mới hoặc cập nhật tài khoản (Quản trị viên, Khách hàng, Nhà thầu phụ) bắt buộc phải kết thúc bằng đuôi `@gmail.com` (sử dụng rule `ends_with:@gmail.com`) và không được chứa ký tự có dấu (sử dụng rule `regex`). Các email có đuôi khác hoặc chứa dấu tiếng Việt đều không hợp lệ và bị chặn.

---

## 🔔 11b. Hệ thống thông báo nghiệm thu và thông báo khách hàng (Notification System)
Hệ thống lưu trữ và gửi thông báo theo từng `user_id` đang đăng nhập. Admin vẫn nhận các thông báo vận hành, đồng thời khách hàng của dự án cũng nhận được thông báo khi dự án/hợp đồng/thanh toán/nghiệm thu có thay đổi quan trọng.
- **Bảng cơ sở dữ liệu:** `notifications` chứa các cột `user_id` (Khóa ngoại bắt buộc trỏ đến `users.id`, `ON DELETE CASCADE`), `title` (Tiêu đề), `content` (Nội dung chi tiết), `type` (Loại thông báo: ví dụ `ACCEPTANCE_REQUEST`, `ACCEPTANCE_APPROVED`, `PAYMENT_REMINDER`, `PROJECT_CREATED`, `CLIENT_CONTRACT_UPDATED`, `PROJECT_PAYMENT_CREATED`, `TASK_DETAIL_APPROVED`), `related_id` (ID thực thể liên quan), `is_read` (Trạng thái đã đọc, boolean), và `created_at` (Thời gian tạo). Model `User` có quan hệ `hasMany` và model `Notification` có quan hệ `belongsTo` tương ứng.
- **Quy tắc kích hoạt (Trigger rule):**
  1. Khi Nhà thầu phụ gửi yêu cầu nghiệm thu cho công việc con (`TaskDetail` đạt 100% tiến độ), hệ thống tự động tạo bản ghi thông báo loại `ACCEPTANCE_REQUEST` cho tất cả tài khoản có vai trò `'Quản trị viên'` hoặc `'Admin'`.
  2. Khi Admin/Quản trị viên phê duyệt nghiệm thu hoàn thành cho công việc con (`TaskDetail` chuyển sang trạng thái nghiệm thu `APPROVED`), hệ thống tự động tạo bản ghi thông báo loại `ACCEPTANCE_APPROVED` cho tất cả tài khoản có vai trò `'Quản trị viên'` hoặc `'Admin'` để nhắc nhở lập phiếu chi thanh toán.
  3. Đồng thời tại thời điểm phê duyệt nghiệm thu, nếu công việc chưa được thanh toán hoàn tất (số dư còn lại chưa thanh toán `remaining_amount > 0`), hệ thống sẽ tự động tạo thêm thông báo loại `PAYMENT_REMINDER` để nhắc nhở ban quản lý lập phiếu chi thanh toán.
- **Luồng thông báo cho khách hàng:**
  - `ProjectController`: bắn thông báo khi dự án mới được tạo, khi dự án được cập nhật và khi dự án chuyển sang trạng thái tạm dừng.
  - `ClientContractController`: bắn thông báo khi hợp đồng khách hàng được tạo/cập nhật/xóa hoặc khi hợp đồng bị chấm dứt làm dự án tạm dừng.
  - `ContractAddendumController`: bắn thông báo khi phụ lục hợp đồng được tạo/cập nhật/xóa.
  - `ProjectPaymentController`: bắn thông báo cho khách hàng khi phiếu thu của dự án được tạo hoặc cập nhật.
  - `TaskDetailService`: bắn thông báo cho khách hàng khi công việc con được duyệt nghiệm thu hoặc bị từ chối nghiệm thu.
- **Các API endpoints:**
  - `GET /api/notifications`: Lấy danh sách thông báo của người dùng hiện tại (sắp xếp ID giảm dần).
  - `PUT /api/notifications/{id}/read`: Đánh dấu một thông báo cụ thể là đã đọc.
  - `PUT /api/notifications/read-all`: Đánh dấu toàn bộ thông báo chưa đọc của người dùng hiện tại là đã đọc.

## 📁 11c. Module Quản lý Danh mục dự án (Project Category Management Module)
Module này quản lý phân loại các loại hình công trình xây dựng (ví dụ: Nhà cấp 4, Nhà mái thái, Xây dựng cầu cống...).
- **Bảng cơ sở dữ liệu:** `project_categories` chứa các cột `category_code` (Mã danh mục, duy nhất), `name` (Tên danh mục), và `status` (Trạng thái hoạt động, boolean/tinyint). Không còn `deleted_at` hay cơ chế soft delete.
- **Quy tắc xóa danh mục dự án (Conditional Deletion Rule):**
  - Khi thực hiện xóa danh mục dự án thông qua API `DELETE /api/project-categories/{id}`, nếu danh mục chưa được sử dụng trong dự án nào thì hệ thống xóa vĩnh viễn (hard delete) bản ghi danh mục.
  - Nếu danh mục đã được gắn với ít nhất một dự án, API sẽ chặn xóa để tránh vi phạm foreign key.
  - `Project` không còn dùng `withTrashed()` cho quan hệ `category` vì danh mục không còn soft delete.

---

## 🛡️ 12. Quy tắc viết API (API Design Guidelines)
- **Response Format:** Tất cả response từ controller phải trả về dưới dạng JSON (`JsonResponse`).
- **Validation:** Sử dụng `Validator::make($request->all(), [...])` trực tiếp trong Controller. Khi validation thất bại, trả về HTTP status `422` kèm danh sách lỗi chi tiết.
  - **Lưu ý đặc biệt cho File Upload:** Không sử dụng quy tắc `mimes` mặc định của Laravel cho tài liệu văn bản (như `.doc`, `.docx`, `.pdf`, `.xls`, `.xlsx`, `.zip`) vì PHP fileinfo có thể xác định sai loại MIME (ví dụ thành `application/octet-stream` hoặc `text/plain`). Thay vào đó, hãy sử dụng quy tắc tùy chỉnh **`allowed_extensions:ext1,ext2,...`** (ví dụ: `allowed_extensions:pdf,doc,docx,xls,xlsx,jpg,jpeg,png,zip,webp`) được định nghĩa trong `AppServiceProvider.php` để kiểm tra phần mở rộng thực tế của tệp tin.
- **Xóa mềm / Vô hiệu hóa (Soft Disable):** Đối với các API xóa (`destroy()`) ngoài các module Hợp đồng:
  - Khách hàng/Nhân viên: Cập nhật cột `status = 0` (Vô hiệu hóa).
  - Dự án: Cập nhật cột `status = 'ON_HOLD'` (Tạm ngưng).

---

## 💻 13. Các lệnh khởi chạy nhanh (Quick Start)
```bash
# Cài đặt thư viện PHP
composer install

# Tạo liên kết symbolic link để phục vụ tệp đính kèm công khai (tránh lỗi 403)
php artisan storage:link

# Khởi chạy dự án ở chế độ Dev
composer run dev

# Chạy kiểm thử tự động hệ thống Hợp đồng & Phân rã công việc
DB_CONNECTION=mysql DB_DATABASE=LVTNTRUNGNGUYEN php artisan test --filter=ClientContractTest
DB_CONNECTION=mysql DB_DATABASE=LVTNTRUNGNGUYEN php artisan test --filter=SubContractTest
DB_CONNECTION=mysql DB_DATABASE=LVTNTRUNGNGUYEN php artisan test --filter=MaterialContractTest
DB_CONNECTION=mysql DB_DATABASE=LVTNTRUNGNGUYEN php artisan test --filter=ProjectTaskBreakdownTest
DB_CONNECTION=mysql DB_DATABASE=LVTNTRUNGNGUYEN php artisan test --filter=ProjectDocumentTest
DB_CONNECTION=mysql DB_DATABASE=LVTNTRUNGNGUYEN php artisan test --filter=ProjectCategoryTest
```
