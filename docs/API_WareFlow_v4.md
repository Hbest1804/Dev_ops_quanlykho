# API WareFlow v4

> Converted from `API_WareFlow_v4.docx`. Cover page and personal information were removed.

## 1. TỔNG QUAN

### 1.1. Giới Thiệu

Tài liệu này mô tả toàn bộ các API endpoint của hệ thống WareFlow. API được xây dựng theo chuẩn RESTful, sử dụng JSON làm định dạng trao đổi dữ liệu và JWT để xác thực người dùng.

### 1.2. Base URL

Production 1:  https://wm.huy-vu.uk/

Production 2:  https://dev-ops-quanlykho.vercel.app/ 

Development: http://localhost:5173/

### 1.3. Xác Thực

Hầu hết các endpoint yêu cầu JWT token trong header:

Authorization: Bearer <access_token>

Token được cấp sau khi đăng nhập thành công và có hiệu lực trong 8 giờ.

### 1.4. Định Dạng Response

Định dạng response chuẩn: Mọi response đều theo cấu trúc:

```json
{
"success": true | false,
"message": "...",
"data": { ... } | null
}
```

Ví dụ response thành công:

```json
{
"success": true,
"message": "OK",
"data": {
"id": 1,
"name": "Sản phẩm A"
}
}
```

Ví dụ response lỗi:

```json
{
"success": false,
"message": "Validation error",
"data": null
}
```

### 1.5. HTTP Status Codes

| Status | Tên | Ý nghĩa |
| --- | --- | --- |
| 200 | OK | Request thành công, trả về dữ liệu |
| 201 | Created | Tạo resource mới thành công |
| 204 | No Content | Thành công, không có dữ liệu trả về (thường cho DELETE) |
| 400 | Bad Request | Dữ liệu đầu vào không hợp lệ |
| 401 | Unauthorized | Chưa xác thực hoặc token hết hạn |
| 403 | Forbidden | Đã xác thực nhưng không đủ quyền |
| 404 | Not Found | Resource không tồn tại |
| 409 | Conflict | Xung đột dữ liệu (ví dụ: trùng mã) |
| 422 | Unprocessable Entity | Dữ liệu hợp lệ về cú pháp nhưng không thể xử lý |
| 500 | Internal Server Error | Lỗi phía server |

### 1.6. Phân Quyền

| Vai trò | Quyền hạn |
| --- | --- |
| admin | Toàn quyền: quản lý sản phẩm, nhập/xuất kho, báo cáo, quản lý người dùng |
| warehouse_staff (Thủ kho) | Tạo/xác nhận/hủy phiếu nhập xuất, xem sản phẩm và tồn kho |
| accountant (Kế toán/Quản lý) | Chỉ xem báo cáo và thống kê, không thao tác dữ liệu kho |

## 2. XÁC THỰC (AUTH)

Nhóm API quản lý đăng nhập và phiên làm việc của người dùng.

### 2.1. Danh Sách Endpoint

| Method | Endpoint | Mô tả | Auth |
| --- | --- | --- | --- |
| POST | /auth/login | Đăng nhập, nhận JWT token | Không |
| POST | /auth/logout | Đăng xuất, revoke refresh token | Có |
| POST | /auth/refresh | Làm mới access token bằng refresh token | Không |
| GET | /auth/me | Lấy thông tin người dùng hiện tại | Có |

### 2.2. Chi Tiết

#### 2.2.1. Đăng Nhập

| POST | /auth/login  — Đăng nhập |
| --- | --- |
| Xác thực | Không yêu cầu |
| Mô tả | Xác thực người dùng bằng email và mật khẩu. Trả về accessToken trong body; refresh token được set vào HttpOnly cookie (không accessible qua JS). |
| Request Body | application/json<br>"email": string * — Email tài khoản<br>"password": string * — Mật khẩu (tối thiểu 8 ký tự) |
| Status | Response |
| 200 | Đăng nhập thành công. Set-Cookie: refreshToken=...; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth/refresh<br>Example:<br>{<br>"success": true,<br>"message": "Login successful",<br>"data": {<br>"accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",<br>"user": {<br>"id": 1, "name": "Người dùng mẫu",<br>"email": "user@example.com",<br>"role": "admin"<br>}<br>}<br>} |
| 400 | Thiếu email hoặc mật khẩu.<br>Example:<br>{"success":false,"message":"Email and password are required","data":null} |
| 401 | Sai thông tin đăng nhập.<br>Example:<br>{"success":false,"message":"Invalid credentials","data":null} |
| 403 | Tài khoản bị khóa.<br>Example:<br>{"success":false,"message":"Account is disabled","data":null} |
| 500 | Internal Server Error.<br>Example:<br>{"success":false,"message":"Internal server error"} |

#### 2.2.2. Đăng Xuất

| POST | /auth/logout  — Đăng xuất |
| --- | --- |
| Xác thực | Bearer Token (JWT) |
| Mô tả | Đăng xuất người dùng. Backend đọc HttpOnly cookie, revoke refresh token trong DB, sau đó clear cookie (Set-Cookie: refreshToken=; Max-Age=0). Frontend chỉ cần xóa accessToken khỏi memory. |
| Status | Response |
| 200 | Đăng xuất thành công.<br>Example:<br>{"success":true,"message":"Logged out successfully","data":null} |
| 401 | Unauthorized — Token không hợp lệ hoặc hết hạn.<br>Example:<br>{"success":false,"message":"Unauthorized"} |
| 500 | Internal Server Error.<br>Example:<br>{"success":false,"message":"Internal server error"} |

#### 2.2.3. Làm Mới Access Token (Refresh)

| POST | /auth/refresh  — Làm mới access token |
| --- | --- |

| Xác thực | Không yêu cầu access token. Refresh token đọc từ HttpOnly cookie tự động. |
| --- | --- |
| Mô tả | Đọc refresh token từ HttpOnly cookie (không cần gửi trong body). Cấp accessToken mới trong body. Thực hiện token rotation: cookie cũ bị revoke, set cookie mới. Nếu phát hiện reuse attack (token đã rotation bị dùng lại), toàn bộ session của user bị revoke. |
| Request Body | application/json<br>refreshToken (HttpOnly cookie — trình duyệt tự gửi, không cần set thủ công): string * — Refresh token hiện tại |

| Status | Response |
| --- | --- |
| 200 | Thành công. Body trả về accessToken mới. Set-Cookie: refreshToken mới (rotation); HttpOnly; Secure; SameSite=Strict.<br>Example:<br>{<br>"success": true,<br>"data": {<br>"accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",<br>(refreshToken được set qua Set-Cookie header, không có trong body)<br>}<br>} |
| 400 | Không có refreshToken cookie trong request (cookie bị xóa hoặc hết hạn). |
| 401 | Refresh token không hợp lệ, đã hết hạn, hoặc đã bị revoke.<br>{"success":false,"message":"Invalid or expired refresh token","data":null} |
| 401 | Reuse attack: token cũ được dùng lại sau khi đã rotation. Hệ thống tự động revoke toàn bộ session của user.<br>{"success":false,"message":"Token reuse detected. All sessions revoked.","data":null} |
| 500 | Internal Server Error. |

#### 2.2.4. Lấy Thông Tin Người Dùng Hiện Tại

| GET | /auth/me  — Lấy thông tin người dùng hiện tại |
| --- | --- |
| Xác thực | Bearer Token (JWT) |
| Mô tả | Trả về thông tin của người dùng đang đăng nhập dựa trên token. |
| Status | Response |
| 200 | Thành công.<br>Example:<br>{<br>"success": true,<br>"data": {<br>"id": 1,<br>"name": "Người dùng mẫu",<br>"email": "user@example.com",<br>"role": "admin",<br>"createdAt": "2025-01-01T00:00:00.000Z"<br>}<br>} |
| 401 | Unauthorized — Token không hợp lệ hoặc hết hạn.<br>Example:<br>{"success":false,"message":"Unauthorized"} |
| 500 | Internal Server Error.<br>Example:<br>{"success":false,"message":"Internal server error"} |

## 3. SẢN PHẨM (PRODUCTS)

Nhóm API quản lý danh mục sản phẩm/hàng hóa trong kho.

### 3.1. Danh Sách Endpoint

| Method | Endpoint | Mô tả | Auth |
| --- | --- | --- | --- |
| GET | /products | Lấy danh sách sản phẩm (có lọc/tìm kiếm) | Có |
| GET | /products/:id | Lấy chi tiết một sản phẩm | Có |
| POST | /products | Tạo sản phẩm mới | Có (admin, warehouse_staff) |
| PUT | /products/:id | Cập nhật thông tin sản phẩm | Có (admin, warehouse_staff) |
| DELETE | /products/:id | Xóa sản phẩm | Có (admin) |
| GET | /products/:id/transactions | Lấy lịch sử giao dịch của sản phẩm | Có |

### 3.2. Chi Tiết

#### 3.2.1. Lấy Danh Sách Sản Phẩm

| GET | /products  — Lấy danh sách sản phẩm |
| --- | --- |
| Xác thực | Bearer Token (JWT) |
| Mô tả | Trả về danh sách sản phẩm, hỗ trợ tìm kiếm và lọc theo danh mục. |
| Query Params | search (string) (opt) — Tìm kiếm theo tên hoặc mã sản phẩm<br>category (string) (opt) — Lọc theo danh mục<br>page (integer) (opt) — Số trang (mặc định: 1)<br>limit (integer) (opt) — Số bản ghi mỗi trang (mặc định: 20, tối đa: 100) |
| Status | Response |
| 200 | Thành công.<br>Example:<br>{<br>"success": true,<br>"data": {<br>"items": [<br>{<br>"id": 1, "code": "SP001",<br>"name": "Bàn phím cơ",<br>"category": "Thiết bị ngoại vi",<br>"unit": "Cái",<br>"stock": 50,<br>"description": "Bàn phím cơ Cherry MX"<br>}<br>],<br>"total": 120,<br>"page": 1,<br>"limit": 20<br>}<br>} |
| 401 | Unauthorized — Token không hợp lệ hoặc hết hạn.<br>Example:<br>{"success":false,"message":"Unauthorized"} |
| 500 | Internal Server Error.<br>Example:<br>{"success":false,"message":"Internal server error"} |

#### 3.2.2. Lấy Chi Tiết Sản Phẩm

| GET | /products/:id  — Lấy chi tiết sản phẩm |
| --- | --- |
| Xác thực | Bearer Token (JWT) |
| Path Params | {id} (integer) — ID của sản phẩm |
| Status | Response |
| 200 | Thành công.<br>Example:<br>{<br>"success": true,<br>"data": {<br>"id": 1, "code": "SP001",<br>"name": "Bàn phím cơ",<br>"category": "Thiết bị ngoại vi",<br>"unit": "Cái",<br>"stock": 50,<br>"description": "Bàn phím cơ Cherry MX",<br>"createdAt": "2025-01-01T00:00:00.000Z"<br>}<br>} |
| 401 | Unauthorized — Token không hợp lệ hoặc hết hạn.<br>Example:<br>{"success":false,"message":"Unauthorized"} |
| 404 | Not Found — Không tìm thấy resource.<br>Example:<br>{"success":false,"message":"Not found"} |
| 500 | Internal Server Error.<br>Example:<br>{"success":false,"message":"Internal server error"} |

#### 3.2.3. Tạo Sản Phẩm Mới

| POST | /products  — Tạo sản phẩm mới |
| --- | --- |
| Xác thực | Bearer Token — admin, warehouse_staff |
| Request Body | application/json<br>"code": string * — Mã sản phẩm (duy nhất)<br>"name": string * — Tên sản phẩm<br>"category": string * — Danh mục sản phẩm<br>"unit": string * — Đơn vị tính (Cái, Hộp, Kg...)<br>"description": string * — Mô tả sản phẩm<br>"initialStock": integer * — Số lượng tồn kho ban đầu (mặc định: 0) |
| Status | Response |
| 201 | Tạo thành công.<br>Example:<br>{"success":true,"message":"Product created","data":{"id":5,"code":"SP005","name":"..."}} |
| 400 | Dữ liệu không hợp lệ (thiếu trường bắt buộc). |
| 409 | Mã sản phẩm đã tồn tại.<br>Example:<br>{"success":false,"message":"Product code already exists","data":null} |
| 401 | Unauthorized — Token không hợp lệ hoặc hết hạn.<br>Example:<br>{"success":false,"message":"Unauthorized"} |
| 403 | Forbidden — Không đủ quyền hạn.<br>Example:<br>{"success":false,"message":"Forbidden"} |
| 500 | Internal Server Error.<br>Example:<br>{"success":false,"message":"Internal server error"} |

#### 3.2.4. Cập Nhật Sản Phẩm

| PUT | /products/:id  — Cập nhật thông tin sản phẩm |
| --- | --- |
| Xác thực | Bearer Token — admin, warehouse_staff |
| Path Params | {id} (integer) — ID của sản phẩm |
| Request Body | application/json<br>"name": string * — Tên sản phẩm<br>"category": string * — Danh mục sản phẩm<br>"unit": string * — Đơn vị tính<br>"description": string * — Mô tả sản phẩm |
| Status | Response |
| 200 | Cập nhật thành công.<br>Example:<br>{"success":true,"message":"Product updated","data":{...}} |
| 400 | Dữ liệu không hợp lệ. |
| 401 | Unauthorized — Token không hợp lệ hoặc hết hạn.<br>Example:<br>{"success":false,"message":"Unauthorized"} |
| 403 | Forbidden — Không đủ quyền hạn.<br>Example:<br>{"success":false,"message":"Forbidden"} |
| 404 | Not Found — Không tìm thấy resource.<br>Example:<br>{"success":false,"message":"Not found"} |
| 500 | Internal Server Error.<br>Example:<br>{"success":false,"message":"Internal server error"} |

#### 3.2.5. Xóa Sản Phẩm

| DELETE | /products/:id  — Xóa sản phẩm |
| --- | --- |
| Xác thực | Bearer Token — admin |
| Path Params | {id} (integer) — ID của sản phẩm |
| Status | Response |
| 200 | Xóa thành công.<br>Example:<br>{"success":true,"message":"Product deleted","data":null} |
| 422 | Sản phẩm có tồn kho > 0, yêu cầu xác nhận force.<br>Example:<br>{"success":false,"message":"Product has stock > 0","data":null} |
| 401 | Unauthorized — Token không hợp lệ hoặc hết hạn.<br>Example:<br>{"success":false,"message":"Unauthorized"} |
| 403 | Forbidden — Không đủ quyền hạn.<br>Example:<br>{"success":false,"message":"Forbidden"} |
| 404 | Not Found — Không tìm thấy resource.<br>Example:<br>{"success":false,"message":"Not found"} |
| 500 | Internal Server Error.<br>Example:<br>{"success":false,"message":"Internal server error"} |

#### 3.2.6. Lịch Sử Giao Dịch Sản Phẩm

| GET | /products/:id/transactions  — Lấy lịch sử giao dịch |
| --- | --- |
| Xác thực | Bearer Token (JWT) |
| Path Params | {id} (integer) — ID của sản phẩm |
| Query Params | from (date) (opt) — Từ ngày (YYYY-MM-DD)<br>to (date) (opt) — Đến ngày (YYYY-MM-DD)<br>page (integer) (opt) — Số trang (mặc định: 1)<br>limit (integer) (opt) — Số bản ghi mỗi trang (mặc định: 20) |
| Status | Response |
| 200 | Thành công.<br>Example:<br>{<br>"success": true,<br>"data": {<br>"items": [<br>{<br>"type": "import",<br>"quantity": 20,<br>"stockAfter": 70,<br>"note": "Nhập từ NCC ABC",<br>"createdBy": "Người dùng mẫu",<br>"createdAt": "2025-06-01T09:00:00.000Z"<br>}<br>],<br>"total": 45<br>}<br>} |
| 401 | Unauthorized — Token không hợp lệ hoặc hết hạn.<br>Example:<br>{"success":false,"message":"Unauthorized"} |
| 404 | Not Found — Không tìm thấy resource.<br>Example:<br>{"success":false,"message":"Not found"} |
| 500 | Internal Server Error.<br>Example:<br>{"success":false,"message":"Internal server error"} |

## 4. NHẬP KHO (IMPORT ORDERS)

Nhóm API quản lý phiếu nhập kho.

### 4.1. Danh Sách Endpoint

| Method | Endpoint | Mô tả | Auth |
| --- | --- | --- | --- |
| GET | /import-orders | Lấy danh sách phiếu nhập | Có |
| GET | /import-orders/:id | Lấy chi tiết phiếu nhập | Có |
| POST | /import-orders | Tạo phiếu nhập mới | Có (admin, warehouse_staff) |
| POST | /import-orders/:id/confirm | Xác nhận phiếu nhập | Có (admin, warehouse_staff) |
| POST | /import-orders/:id/cancel | Hủy phiếu nhập | Có (admin, warehouse_staff) |

### 4.2. Chi Tiết

#### 4.2.1. Lấy Danh Sách Phiếu Nhập

| GET | /import-orders  — Lấy danh sách phiếu nhập |
| --- | --- |
| Xác thực | Bearer Token (JWT) |
| Query Params | status (string) (opt) — Lọc theo trạng thái: pending \| confirmed \| cancelled<br>from (date) (opt) — Từ ngày (YYYY-MM-DD)<br>to (date) (opt) — Đến ngày (YYYY-MM-DD)<br>page (integer) (opt) — Số trang (mặc định: 1)<br>limit (integer) (opt) — Số bản ghi mỗi trang (mặc định: 20) |
| Status | Response |
| 200 | Thành công.<br>Example:<br>{<br>"success": true,<br>"data": {<br>"items": [<br>{<br>"id": 1, "code": "PN001",<br>"supplier": "Công ty ABC",<br>"status": "confirmed",<br>"importDate": "2025-06-01",<br>"createdBy": "Người dùng mẫu",<br>"createdAt": "2025-06-01T08:00:00.000Z"<br>}<br>],<br>"total": 30, "page": 1<br>}<br>} |
| 401 | Unauthorized — Token không hợp lệ hoặc hết hạn.<br>Example:<br>{"success":false,"message":"Unauthorized"} |
| 500 | Internal Server Error.<br>Example:<br>{"success":false,"message":"Internal server error"} |

#### 4.2.2. Lấy Chi Tiết Phiếu Nhập

| GET | /import-orders/:id  — Lấy chi tiết phiếu nhập |
| --- | --- |
| Xác thực | Bearer Token (JWT) |
| Path Params | {id} (integer) — ID phiếu nhập |
| Status | Response |
| 200 | Thành công.<br>Example:<br>{<br>"success": true,<br>"data": {<br>"id": 1, "code": "PN001",<br>"supplier": "Công ty ABC",<br>"status": "confirmed",<br>"importDate": "2025-06-01",<br>"items": [<br>{"productId":1,"productName":"Bàn phím cơ","quantity":20,"unit":"Cái"}<br>],<br>"createdBy": "Người dùng mẫu"<br>}<br>} |
| 401 | Unauthorized — Token không hợp lệ hoặc hết hạn.<br>Example:<br>{"success":false,"message":"Unauthorized"} |
| 404 | Not Found — Không tìm thấy resource.<br>Example:<br>{"success":false,"message":"Not found"} |
| 500 | Internal Server Error.<br>Example:<br>{"success":false,"message":"Internal server error"} |

#### 4.2.3. Tạo Phiếu Nhập

| POST | /import-orders  — Tạo phiếu nhập kho |
| --- | --- |
| Xác thực | Bearer Token — admin, warehouse_staff |
| Mô tả | Tạo phiếu nhập với trạng thái 'pending'. Tồn kho chưa được cập nhật. |
| Request Body | application/json<br>"supplier": string * — Tên nhà cung cấp<br>"importDate": date * — Ngày nhập (YYYY-MM-DD)<br>"note": string * — Ghi chú<br>"items": array * — Danh sách hàng hóa (tối thiểu 1 dòng)<br>"items[].productId": integer * — ID sản phẩm<br>"items[].quantity": integer * — Số lượng nhập (> 0) |
| Status | Response |
| 201 | Tạo thành công.<br>Example:<br>{<br>"success": true,<br>"data": {<br>"id": 10, "code": "PN010",<br>"status": "pending",<br>"supplier": "Công ty ABC"<br>}<br>} |
| 400 | Dữ liệu không hợp lệ (thiếu items, quantity <= 0...). |
| 401 | Unauthorized — Token không hợp lệ hoặc hết hạn.<br>Example:<br>{"success":false,"message":"Unauthorized"} |
| 403 | Forbidden — Không đủ quyền hạn.<br>Example:<br>{"success":false,"message":"Forbidden"} |
| 500 | Internal Server Error.<br>Example:<br>{"success":false,"message":"Internal server error"} |

#### 4.2.4. Xác Nhận Phiếu Nhập

| POST | /import-orders/:id/confirm  — Xác nhận phiếu nhập |
| --- | --- |
| Xác thực | Bearer Token — admin, warehouse_staff |
| Mô tả | Xác nhận phiếu nhập: chuyển trạng thái sang 'confirmed' và cộng số lượng vào tồn kho. Thao tác này không thể hoàn tác. |
| Path Params | {id} (integer) — ID phiếu nhập |
| Status | Response |
| 200 | Xác nhận thành công, tồn kho đã được cập nhật.<br>Example:<br>{"success":true,"message":"Import order confirmed","data":{"id":10,"status":"confirmed"}} |
| 409 | Phiếu không ở trạng thái pending.<br>Example:<br>{"success":false,"message":"Order is not in pending status","data":null} |
| 401 | Unauthorized — Token không hợp lệ hoặc hết hạn.<br>Example:<br>{"success":false,"message":"Unauthorized"} |
| 403 | Forbidden — Không đủ quyền hạn.<br>Example:<br>{"success":false,"message":"Forbidden"} |
| 404 | Not Found — Không tìm thấy resource.<br>Example:<br>{"success":false,"message":"Not found"} |
| 500 | Internal Server Error.<br>Example:<br>{"success":false,"message":"Internal server error"} |

#### 4.2.5. Hủy Phiếu Nhập

| POST | /import-orders/:id/cancel  — Hủy phiếu nhập |
| --- | --- |
| Xác thực | Bearer Token — admin, warehouse_staff |
| Path Params | {id} (integer) — ID phiếu nhập |
| Status | Response |
| 200 | Hủy thành công.<br>Example:<br>{"success":true,"message":"Import order cancelled","data":{"id":10,"status":"cancelled"}} |
| 409 | Phiếu không ở trạng thái pending (đã xác nhận/hủy).<br>Example:<br>{"success":false,"message":"Order is not in pending status","data":null} |
| 401 | Unauthorized — Token không hợp lệ hoặc hết hạn.<br>Example:<br>{"success":false,"message":"Unauthorized"} |
| 403 | Forbidden — Không đủ quyền hạn.<br>Example:<br>{"success":false,"message":"Forbidden"} |
| 404 | Not Found — Không tìm thấy resource.<br>Example:<br>{"success":false,"message":"Not found"} |
| 500 | Internal Server Error.<br>Example:<br>{"success":false,"message":"Internal server error"} |

## 5. XUẤT KHO (EXPORT ORDERS)

Nhóm API quản lý phiếu xuất kho.

### 5.1. Danh Sách Endpoint

| Method | Endpoint | Mô tả | Auth |
| --- | --- | --- | --- |
| GET | /export-orders | Lấy danh sách phiếu xuất | Có |
| GET | /export-orders/:id | Lấy chi tiết phiếu xuất | Có |
| POST | /export-orders | Tạo phiếu xuất mới | Có (admin, warehouse_staff) |
| POST | /export-orders/:id/confirm | Xác nhận phiếu xuất | Có (admin, warehouse_staff) |
| POST | /export-orders/:id/cancel | Hủy phiếu xuất | Có (admin, warehouse_staff) |

### 5.2. Chi Tiết

#### 5.2.1. Lấy Danh Sách Phiếu Xuất

| GET | /export-orders  — Lấy danh sách phiếu xuất |
| --- | --- |
| Xác thực | Bearer Token (JWT) |
| Query Params | status (string) (opt) — Lọc theo trạng thái: pending \| confirmed \| cancelled<br>reason (string) (opt) — Lọc theo lý do: sale \| internal \| damaged<br>from (date) (opt) — Từ ngày (YYYY-MM-DD)<br>to (date) (opt) — Đến ngày (YYYY-MM-DD)<br>page (integer) (opt) — Số trang (mặc định: 1)<br>limit (integer) (opt) — Số bản ghi mỗi trang (mặc định: 20) |
| Status | Response |
| 200 | Thành công.<br>Example:<br>{<br>"success": true,<br>"data": {<br>"items": [<br>{<br>"id": 1, "code": "PX001",<br>"reason": "sale",<br>"status": "confirmed",<br>"exportDate": "2025-06-05",<br>"createdBy": "Người dùng mẫu"<br>}<br>],<br>"total": 25<br>}<br>} |
| 401 | Unauthorized — Token không hợp lệ hoặc hết hạn.<br>Example:<br>{"success":false,"message":"Unauthorized"} |
| 500 | Internal Server Error.<br>Example:<br>{"success":false,"message":"Internal server error"} |

#### 5.2.2. Lấy Chi Tiết Phiếu Xuất

| GET | /export-orders/:id  — Lấy chi tiết phiếu xuất |
| --- | --- |
| Xác thực | Bearer Token (JWT) |
| Path Params | {id} (integer) — ID phiếu xuất |
| Status | Response |
| 200 | Thành công.<br>Example:<br>{<br>"success": true,<br>"data": {<br>"id": 1, "code": "PX001",<br>"reason": "sale",<br>"status": "confirmed",<br>"exportDate": "2025-06-05",<br>"items": [<br>{"productId":1,"productName":"Bàn phím cơ","quantity":5,"unit":"Cái"}<br>]<br>}<br>} |
| 401 | Unauthorized — Token không hợp lệ hoặc hết hạn.<br>Example:<br>{"success":false,"message":"Unauthorized"} |
| 404 | Not Found — Không tìm thấy resource.<br>Example:<br>{"success":false,"message":"Not found"} |
| 500 | Internal Server Error.<br>Example:<br>{"success":false,"message":"Internal server error"} |

#### 5.2.3. Tạo Phiếu Xuất

| POST | /export-orders  — Tạo phiếu xuất kho |
| --- | --- |
| Xác thực | Bearer Token — admin, warehouse_staff |
| Mô tả | Tạo phiếu xuất với trạng thái 'pending'. Hệ thống kiểm tra tồn kho tức thời cho từng dòng hàng, từ chối nếu không đủ. |
| Request Body | application/json<br>"reason": string * — Lý do xuất: sale \| internal \| damaged<br>"exportDate": date * — Ngày xuất (YYYY-MM-DD)<br>"note": string * — Ghi chú<br>"items": array * — Danh sách hàng hóa (tối thiểu 1 dòng)<br>"items[].productId": integer * — ID sản phẩm<br>"items[].quantity": integer * — Số lượng xuất (> 0) |
| Status | Response |
| 201 | Tạo thành công.<br>Example:<br>{"success":true,"data":{"id":8,"code":"PX008","status":"pending","reason":"sale"}} |
| 400 | Dữ liệu không hợp lệ. |
| 422 | Số lượng xuất vượt tồn kho.<br>Example:<br>{"success":false,"message":"Insufficient stock for product SP001 (available: 10, requested: 20)","data":null} |
| 401 | Unauthorized — Token không hợp lệ hoặc hết hạn.<br>Example:<br>{"success":false,"message":"Unauthorized"} |
| 403 | Forbidden — Không đủ quyền hạn.<br>Example:<br>{"success":false,"message":"Forbidden"} |
| 500 | Internal Server Error.<br>Example:<br>{"success":false,"message":"Internal server error"} |

#### 5.2.4. Xác Nhận Phiếu Xuất

| POST | /export-orders/:id/confirm  — Xác nhận phiếu xuất |
| --- | --- |
| Xác thực | Bearer Token — admin, warehouse_staff |
| Mô tả | Xác nhận phiếu xuất: trừ số lượng khỏi tồn kho. Hệ thống kiểm tra lại tồn kho tại thời điểm xác nhận. |
| Path Params | {id} (integer) — ID phiếu xuất |
| Status | Response |
| 200 | Xác nhận thành công.<br>Example:<br>{"success":true,"message":"Export order confirmed","data":{"id":8,"status":"confirmed"}} |
| 409 | Phiếu không ở trạng thái pending. |
| 422 | Tồn kho không đủ tại thời điểm xác nhận.<br>Example:<br>{"success":false,"message":"Insufficient stock at confirmation time","data":null} |
| 401 | Unauthorized — Token không hợp lệ hoặc hết hạn.<br>Example:<br>{"success":false,"message":"Unauthorized"} |
| 403 | Forbidden — Không đủ quyền hạn.<br>Example:<br>{"success":false,"message":"Forbidden"} |
| 404 | Not Found — Không tìm thấy resource.<br>Example:<br>{"success":false,"message":"Not found"} |
| 500 | Internal Server Error.<br>Example:<br>{"success":false,"message":"Internal server error"} |

#### 5.2.5. Hủy Phiếu Xuất

| POST | /export-orders/:id/cancel  — Hủy phiếu xuất |
| --- | --- |
| Xác thực | Bearer Token — admin, warehouse_staff |
| Path Params | {id} (integer) — ID phiếu xuất |
| Status | Response |
| 200 | Hủy thành công.<br>Example:<br>{"success":true,"message":"Export order cancelled","data":{"id":8,"status":"cancelled"}} |
| 409 | Phiếu không ở trạng thái pending. |
| 401 | Unauthorized — Token không hợp lệ hoặc hết hạn.<br>Example:<br>{"success":false,"message":"Unauthorized"} |
| 403 | Forbidden — Không đủ quyền hạn.<br>Example:<br>{"success":false,"message":"Forbidden"} |
| 404 | Not Found — Không tìm thấy resource.<br>Example:<br>{"success":false,"message":"Not found"} |
| 500 | Internal Server Error.<br>Example:<br>{"success":false,"message":"Internal server error"} |

## 6. BÁO CÁO & THỐNG KÊ (REPORTS)

Nhóm API cung cấp dữ liệu báo cáo. Chỉ admin và accountant mới có quyền truy cập.

### 6.1. Danh Sách Endpoint

| Method | Endpoint | Mô tả | Auth |
| --- | --- | --- | --- |
| GET | /reports/summary | Báo cáo tổng hợp nhập–xuất–tồn theo kỳ | Có (admin, accountant) |
| GET | /reports/top-products | Top sản phẩm nhập/xuất nhiều nhất | Có (admin, accountant) |
| GET | /reports/export | Xuất báo cáo ra file Excel hoặc PDF | Có (admin, accountant) |

### 6.2. Chi Tiết

#### 6.2.1. Báo Cáo Tổng Hợp

| GET | /reports/summary  — Báo cáo tổng hợp nhập–xuất–tồn |
| --- | --- |
| Xác thực | Bearer Token — admin, accountant |
| Mô tả | Trả về báo cáo tổng hợp số lượng nhập, xuất và tồn kho cuối kỳ cho từng sản phẩm. |
| Query Params | from (date) * — Từ ngày (YYYY-MM-DD)<br>to (date) * — Đến ngày (YYYY-MM-DD)<br>category (string) (opt) — Lọc theo danh mục sản phẩm<br>page (integer) (opt) — Số trang (mặc định: 1)<br>limit (integer) (opt) — Số bản ghi mỗi trang (mặc định: 50) |
| Status | Response |
| 200 | Thành công.<br>Example:<br>{<br>"success": true,<br>"data": {<br>"period": {"from":"2025-06-01","to":"2025-06-30"},<br>"items": [<br>{<br>"productId": 1,<br>"productCode": "SP001",<br>"productName": "Bàn phím cơ",<br>"openingStock": 30,<br>"totalImport": 50,<br>"totalExport": 25,<br>"closingStock": 55<br>}<br>],<br>"total": 80<br>}<br>} |
| 400 | Thiếu tham số from hoặc to. |
| 401 | Unauthorized — Token không hợp lệ hoặc hết hạn.<br>Example:<br>{"success":false,"message":"Unauthorized"} |
| 403 | Forbidden — Không đủ quyền hạn.<br>Example:<br>{"success":false,"message":"Forbidden"} |
| 500 | Internal Server Error.<br>Example:<br>{"success":false,"message":"Internal server error"} |

#### 6.2.2. Top Sản Phẩm

| GET | /reports/top-products  — Top sản phẩm nhập/xuất nhiều nhất |
| --- | --- |
| Xác thực | Bearer Token — admin, accountant |
| Query Params | from (date) * — Từ ngày (YYYY-MM-DD)<br>to (date) * — Đến ngày (YYYY-MM-DD)<br>type (string) * — Loại: import \| export<br>limit (integer) (opt) — Số lượng top (mặc định: 10) |
| Status | Response |
| 200 | Thành công.<br>Example:<br>{<br>"success": true,<br>"data": [<br>{"rank":1,"productCode":"SP001","productName":"Bàn phím cơ","totalQuantity":200},<br>{"rank":2,"productCode":"SP003","productName":"Chuột gaming","totalQuantity":150}<br>]<br>} |
| 400 | Thiếu tham số bắt buộc. |
| 401 | Unauthorized — Token không hợp lệ hoặc hết hạn.<br>Example:<br>{"success":false,"message":"Unauthorized"} |
| 403 | Forbidden — Không đủ quyền hạn.<br>Example:<br>{"success":false,"message":"Forbidden"} |
| 500 | Internal Server Error.<br>Example:<br>{"success":false,"message":"Internal server error"} |

#### 6.2.3. Xuất Báo Cáo File

| GET | /reports/export  — Xuất báo cáo ra file |
| --- | --- |
| Xác thực | Bearer Token — admin, accountant |
| Mô tả | Tạo và trả về file báo cáo. Response là binary file, không phải JSON. |
| Query Params | from (date) * — Từ ngày (YYYY-MM-DD)<br>to (date) * — Đến ngày (YYYY-MM-DD)<br>format (string) * — Định dạng file: excel \| pdf<br>category (string) (opt) — Lọc theo danh mục |
| Status | Response |
| 200 | File trả về với Content-Type tương ứng. • Excel: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet • PDF: application/pdf Header Content-Disposition: attachment; filename="report_2025-06.xlsx" |
| 400 | Thiếu tham số hoặc format không hợp lệ. |
| 401 | Unauthorized — Token không hợp lệ hoặc hết hạn.<br>Example:<br>{"success":false,"message":"Unauthorized"} |
| 403 | Forbidden — Không đủ quyền hạn.<br>Example:<br>{"success":false,"message":"Forbidden"} |
| 500 | Internal Server Error.<br>Example:<br>{"success":false,"message":"Internal server error"} |

## 7. NGƯỜI DÙNG (USERS)

Nhóm API quản lý tài khoản người dùng. Chỉ admin mới có quyền quản lý.

### 7.1. Danh Sách Endpoint

| Method | Endpoint | Mô tả | Auth |
| --- | --- | --- | --- |
| GET | /users | Lấy danh sách người dùng | Có (admin) |
| GET | /users/:id | Lấy chi tiết người dùng | Có (admin) |
| POST | /users | Tạo tài khoản mới | Có (admin) |
| PUT | /users/:id | Cập nhật thông tin<br>đổi vai trò | Có (admin) |
| POST | /users/:id/toggle | Khóa<br>mở khóa tài khoản | Có (admin) |
| POST | /users/:id/reset-password | Reset mật khẩu | Có (admin) |

### 7.2. Chi Tiết

#### 7.2.1. Lấy Danh Sách Người Dùng

| GET | /users  — Lấy danh sách người dùng |
| --- | --- |
| Xác thực | Bearer Token — admin |
| Query Params | search (string) (opt) — Tìm theo tên hoặc email<br>role (string) (opt) — Lọc theo vai trò: admin \| warehouse_staff \| accountant<br>status (string) (opt) — Lọc theo trạng thái: active \| disabled |
| Status | Response |
| 200 | Thành công.<br>Example:<br>{<br>"success": true,<br>"data": [<br>{<br>"id": 1, "name": "Người dùng mẫu",<br>"email": "user@example.com",<br>"role": "admin",<br>"status": "active"<br>}<br>]<br>} |
| 401 | Unauthorized — Token không hợp lệ hoặc hết hạn.<br>Example:<br>{"success":false,"message":"Unauthorized"} |
| 403 | Forbidden — Không đủ quyền hạn.<br>Example:<br>{"success":false,"message":"Forbidden"} |
| 500 | Internal Server Error.<br>Example:<br>{"success":false,"message":"Internal server error"} |

#### 7.2.2. Tạo Tài Khoản

| POST | /users  — Tạo tài khoản người dùng mới |
| --- | --- |
| Xác thực | Bearer Token — admin |
| Request Body | application/json<br>"name": string * — Họ và tên<br>"email": string * — Email (duy nhất)<br>"password": string * — Mật khẩu ban đầu (tối thiểu 8 ký tự)<br>"role": string * — Vai trò: admin \| warehouse_staff \| accountant |
| Status | Response |
| 201 | Tạo thành công.<br>Example:<br>{"success":true,"data":{"id":5,"name":"...","email":"...","role":"warehouse_staff","status":"active"}} |
| 400 | Dữ liệu không hợp lệ. |
| 409 | Email đã tồn tại.<br>Example:<br>{"success":false,"message":"Email already in use","data":null} |
| 401 | Unauthorized — Token không hợp lệ hoặc hết hạn.<br>Example:<br>{"success":false,"message":"Unauthorized"} |
| 403 | Forbidden — Không đủ quyền hạn.<br>Example:<br>{"success":false,"message":"Forbidden"} |
| 500 | Internal Server Error.<br>Example:<br>{"success":false,"message":"Internal server error"} |

#### 7.2.3. Cập Nhật Người Dùng

| PUT | /users/:id  — Cập nhật thông tin<br>đổi vai trò |
| --- | --- |
| Xác thực | Bearer Token — admin |
| Path Params | {id} (integer) — ID người dùng |
| Request Body | application/json<br>"name": string * — Họ và tên<br>"role": string * — Vai trò mới: admin \| warehouse_staff \| accountant |
| Status | Response |
| 200 | Cập nhật thành công. |
| 401 | Unauthorized — Token không hợp lệ hoặc hết hạn.<br>Example:<br>{"success":false,"message":"Unauthorized"} |
| 403 | Forbidden — Không đủ quyền hạn.<br>Example:<br>{"success":false,"message":"Forbidden"} |
| 404 | Not Found — Không tìm thấy resource.<br>Example:<br>{"success":false,"message":"Not found"} |
| 500 | Internal Server Error.<br>Example:<br>{"success":false,"message":"Internal server error"} |

#### 7.2.4. Khóa / Mở Khóa Tài Khoản

| POST | /users/:id/toggle  — Khóa hoặc mở khóa tài khoản |
| --- | --- |
| Xác thực | Bearer Token — admin |
| Mô tả | Toggle trạng thái active/disabled. Admin không thể tự khóa tài khoản của chính mình. |
| Path Params | {id} (integer) — ID người dùng |
| Status | Response |
| 200 | Thành công.<br>Example:<br>{"success":true,"message":"Account disabled","data":{"id":5,"status":"disabled"}} |
| 422 | Admin không thể tự khóa chính mình.<br>Example:<br>{"success":false,"message":"Cannot disable your own account","data":null} |
| 401 | Unauthorized — Token không hợp lệ hoặc hết hạn.<br>Example:<br>{"success":false,"message":"Unauthorized"} |
| 403 | Forbidden — Không đủ quyền hạn.<br>Example:<br>{"success":false,"message":"Forbidden"} |
| 404 | Not Found — Không tìm thấy resource.<br>Example:<br>{"success":false,"message":"Not found"} |
| 500 | Internal Server Error.<br>Example:<br>{"success":false,"message":"Internal server error"} |

#### 7.2.5. Reset Mật Khẩu

| POST | /users/:id/reset-password  — Reset mật khẩu người dùng |
| --- | --- |
| Xác thực | Bearer Token — admin |
| Path Params | {id} (integer) — ID người dùng |
| Request Body | application/json<br>"newPassword": string * — Mật khẩu mới (tối thiểu 8 ký tự) |
| Status | Response |
| 200 | Reset thành công.<br>Example:<br>{"success":true,"message":"Password reset successfully","data":null} |
| 401 | Unauthorized — Token không hợp lệ hoặc hết hạn.<br>Example:<br>{"success":false,"message":"Unauthorized"} |
| 403 | Forbidden — Không đủ quyền hạn.<br>Example:<br>{"success":false,"message":"Forbidden"} |
| 404 | Not Found — Không tìm thấy resource.<br>Example:<br>{"success":false,"message":"Not found"} |
| 500 | Internal Server Error.<br>Example:<br>{"success":false,"message":"Internal server error"} |

## PHỤ LỤC: DATA MODELS

### A. Product

| Field | Type | Nullable | Mô tả |
| --- | --- | --- | --- |
| id | integer | No | Primary key, auto increment |
| code | varchar(50) | No | Mã sản phẩm, unique |
| name | varchar(255) | No | Tên sản phẩm |
| category | varchar(100) | No | Danh mục |
| unit | varchar(50) | No | Đơn vị tính |
| description | text | Yes | Mô tả sản phẩm |
| stock | integer | No | Số lượng tồn kho hiện tại (default: 0) |
| createdAt | timestamp | No | Thời điểm tạo |
| updatedAt | timestamp | No | Thời điểm cập nhật lần cuối |

### B. Import Order

| Field | Type | Nullable | Mô tả |
| --- | --- | --- | --- |
| id | integer | No | Primary key |
| code | varchar(20) | No | Mã phiếu nhập, unique (PN001...) |
| supplier | varchar(255) | No | Tên nhà cung cấp |
| status | enum | No | pending \| confirmed \| cancelled |
| importDate | date | No | Ngày nhập hàng |
| note | text | Yes | Ghi chú |
| createdBy | integer | No | FK → users.id |
| createdAt | timestamp | No | Thời điểm tạo |

### C. Export Order

| Field | Type | Nullable | Mô tả |
| --- | --- | --- | --- |
| id | integer | No | Primary key |
| code | varchar(20) | No | Mã phiếu xuất, unique (PX001...) |
| reason | enum | No | sale \| internal \| damaged |
| status | enum | No | pending \| confirmed \| cancelled |
| exportDate | date | No | Ngày xuất hàng |
| note | text | Yes | Ghi chú |
| createdBy | integer | No | FK → users.id |
| createdAt | timestamp | No | Thời điểm tạo |

— Hết tài liệu API Documentation v1.0 —
