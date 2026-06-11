# QUY TẮC PHÁT TRIỂN FRONTEND

## Công nghệ

- React 19
- Vite
- Ant Design
- React Router
- Axios
- React Query

---

## Cấu trúc thư mục

src/
├── pages/
├── components/
├── layouts/
├── services/
├── routes/
├── hooks/
├── utils/
├── constants/
├── assets/

---

## Quy tắc kiến trúc

1. Tách Page và Component.
2. Không gọi API trực tiếp trong Page.
3. API phải nằm trong thư mục services.
4. Tái sử dụng component.
5. Tuân thủ Clean Code.
6. Responsive trên Desktop, Tablet và Mobile.

---

## Quy tắc Pages

Mỗi màn hình là một Page.

Ví dụ:

pages/
├── Dashboard/
├── Projects/
├── Tasks/
├── ConstructionLogs/

Không viết toàn bộ giao diện trong App.jsx.

---

## Quy tắc Components

Component dùng chung phải đặt trong components.

Ví dụ:

- DataTable
- PageHeader
- ConfirmModal
- StatusTag
- UploadFile

Không copy-paste code giữa các màn hình.

---

## Quy tắc API

Không gọi axios trực tiếp trong page.

Sai:

const data = await axios.get('/projects');

Đúng:

projectService.getAll();

---

## Quy tắc Services

Ví dụ:

services/
├── authService.js
├── projectService.js
├── taskService.js

Mỗi module có một service riêng.

---

## Quy tắc Layout

layouts/
├── MainLayout.jsx
├── AuthLayout.jsx

Tất cả màn hình quản trị phải dùng MainLayout.

---

## Quy tắc Ant Design

Ưu tiên sử dụng:

- Table
- Form
- Modal
- Drawer
- Card
- Tabs
- Statistic
- Progress
- Upload

Không tự tạo component nếu Ant Design đã hỗ trợ.

---

## Quy tắc Form

Sử dụng Ant Design Form.

Có validate dữ liệu phía frontend.

Không dùng form HTML thuần.

---

## Quy tắc Bảng dữ liệu

Danh sách dữ liệu phải hỗ trợ:

- Search
- Filter
- Sort
- Pagination

Sử dụng Ant Design Table.

---

## Quy tắc Giao diện

Phong cách:

- Modern Admin Dashboard
- Chuyên nghiệp
- Tối giản
- Responsive

---

## Quy trình làm việc

Trước khi viết code:

1. Phân tích màn hình.
2. Xác định Component cần dùng.
3. Xác định API sử dụng.
4. Đề xuất cấu trúc file.
5. Chờ xác nhận.
6. Mới sinh code.

---

## Hướng dẫn dành cho AI

1. Luôn đọc file này trước khi tạo code.
2. Luôn sử dụng Ant Design.
3. Không gọi API trực tiếp trong Page.
4. Tách Component hợp lý.
5. Tạo cấu trúc thư mục trước khi viết code.
6. Ưu tiên khả năng tái sử dụng.
7. Không tự ý thay đổi thiết kế giao diện đã cung cấp.