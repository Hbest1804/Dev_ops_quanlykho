# 📦 WareFlow – Hệ thống Quản lý Kho

Hệ thống quản lý kho hàng toàn diện, bao gồm quản lý sản phẩm, phiếu nhập/xuất kho, báo cáo thống kê và phân quyền người dùng.

[![CI Pipeline](https://github.com/Hbest1804/Dev_ops_quanlykho/actions/workflows/ci.yml/badge.svg)](https://github.com/Hbest1804/Dev_ops_quanlykho/actions/workflows/ci.yml)

---

## 📐 Kiến trúc hệ thống

```
┌─────────────────────────────────────────────────────┐
│                    CLIENT BROWSER                    │
└─────────────────────┬───────────────────────────────┘
                      │ HTTP / REST API
┌─────────────────────▼───────────────────────────────┐
│           FRONTEND  (React + TypeScript)             │
│               Vite · TailwindCSS v4                  │
│                  Port: 5173                          │
└─────────────────────┬───────────────────────────────┘
                      │ Axios → /api/*
┌─────────────────────▼───────────────────────────────┐
│           BACKEND   (Node.js + Express 5)            │
│         JWT Auth · REST API · PDF/Excel Export       │
│                  Port: 3000                          │
└─────────────────────┬───────────────────────────────┘
                      │ pg (node-postgres)
┌─────────────────────▼───────────────────────────────┐
│             DATABASE  (PostgreSQL 17)                │
│         Local Docker  ─OR─  Supabase Cloud           │
│                  Port: 5432 / 6543                   │
└─────────────────────────────────────────────────────┘
```

### Các module chức năng

| Module | Mô tả |
|---|---|
| **Auth** | Đăng nhập, đăng xuất, refresh token, đổi/reset mật khẩu |
| **Users** | Quản lý tài khoản người dùng (Admin) |
| **Products** | Quản lý danh mục sản phẩm, tồn kho |
| **Import Orders** | Quản lý phiếu nhập kho |
| **Export Orders** | Quản lý phiếu xuất kho |
| **Reports** | Thống kê, báo cáo, xuất PDF/Excel |

---

## 🛠️ Công nghệ sử dụng

### Backend
- **Runtime:** Node.js 22 (ESM)
- **Framework:** Express.js 5
- **Database:** PostgreSQL 17 (qua `node-postgres`)
- **Auth:** JWT + HTTP-only Cookie
- **Export:** PDFKit, XLSX
- **Test:** Vitest
- **Linter:** ESLint

### Frontend
- **Framework:** React 19 + TypeScript
- **Build tool:** Vite 8
- **Styling:** TailwindCSS v4
- **Routing:** React Router DOM v7
- **HTTP Client:** Axios
- **Icons:** Lucide React
- **Test:** Vitest

### DevOps
- **Container:** Docker, Docker Compose
- **CI/CD:** GitHub Actions (Lint → Test → Build → Push GHCR)
- **Registry:** GitHub Container Registry (ghcr.io)

---

## ✅ Yêu cầu hệ thống

| Công cụ | Phiên bản tối thiểu |
|---|---|
| Node.js | 22.x |
| npm | 10.x |
| Docker | 24.x |
| Docker Compose | 2.x (plugin) |
| Git | 2.x |

---

## 🚀 Cách chạy dự án

### Phương án 1 – Chạy thủ công (không dùng Docker)

> Yêu cầu: PostgreSQL đang chạy hoặc có tài khoản **Supabase**.

#### Bước 1 – Clone repository

```bash
git clone -b develop https://github.com/Hbest1804/Dev_ops_quanlykho.git
cd Dev_ops_quanlykho
```

#### Bước 2 – Cấu hình biến môi trường

**Backend:**

```bash
cp backend/.env.example backend/.env
```

Mở `backend/.env` và điền thông tin kết nối:

```env
PORT=3000
CORS_ORIGIN=http://localhost:5173

# Supabase / PostgreSQL
POSTGRES_HOST=aws-0-ap-southeast-1.pooler.supabase.com
POSTGRES_PORT=6543
POSTGRES_DB=postgres
POSTGRES_USER=postgres.xxxxxxxxxxxxxxxxxx
POSTGRES_PASSWORD=your-supabase-db-password

# JWT
JWT_SECRET=your-super-secret-jwt-key

# Tài khoản Admin mặc định (tạo tự động khi khởi động)
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your-secure-admin-password
ADMIN_NAME=Administrator
```

**Frontend:**

```bash
cp frontend/.env.example frontend/.env
```

Mở `frontend/.env` và điền:

```env
BACKEND_URL=http://localhost:3000
```

#### Bước 3 – Khởi tạo database (nếu dùng Supabase)

Truy cập **Supabase Dashboard → SQL Editor**, chạy nội dung file:

```
wareflow_schema.sql
```

Hoặc dùng `psql`:

```bash
psql -h <POSTGRES_HOST> -U <POSTGRES_USER> -d <POSTGRES_DB> -f wareflow_schema.sql
```

#### Bước 4 – Cài đặt gói và chạy Backend

```bash
# Di chuyển vào thư mục backend
cd backend

# Cài đặt các gói phụ thuộc
npm install

# Chạy ở chế độ development (hot-reload)
npm run dev
```

> Backend sẽ khởi động tại: **http://localhost:3000**  
> Kiểm tra: `GET http://localhost:3000/api/health` → `{ "status": "ok" }`

#### Bước 5 – Cài đặt gói và chạy Frontend

Mở terminal mới:

```bash
# Di chuyển vào thư mục frontend
cd frontend

# Cài đặt các gói phụ thuộc
npm install

# Chạy ở chế độ development
npm run dev
```

> Frontend sẽ khởi động tại: **http://localhost:5173**

---

### Phương án 2 – Chạy toàn bộ hệ thống bằng Docker Compose

> Cách này sẽ tự động khởi động **PostgreSQL**, **Backend** và **Frontend** trong một lệnh.

#### Bước 1 – Clone repository

```bash
git clone -b develop https://github.com/Hbest1804/Dev_ops_quanlykho.git
cd Dev_ops_quanlykho
```

#### Bước 2 – Cấu hình biến môi trường

```bash
cp .env.example .env
```

Mở `.env` ở thư mục gốc và điền thông tin:

```env
NODE_ENV=development

# PostgreSQL (Docker tự tạo)
POSTGRES_DB=postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-strong-password

# Admin mặc định
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your-secure-admin-password
ADMIN_NAME=Administrator

# JWT
JWT_SECRET=your-super-secret-jwt-key-replace-me

# Cổng dịch vụ
BACKEND_PORT=3000
FRONTEND_PORT=5173
```

> ⚠️ **Lưu ý:** Khi dùng Docker Compose, PostgreSQL chạy nội bộ (service `db`). Không cần Supabase.

#### Bước 3 – Build và khởi động toàn bộ hệ thống

```bash
# Build image và khởi động tất cả services
docker compose up --build
```

Hoặc chạy ở chế độ nền (detached):

```bash
docker compose up --build -d
```

Theo dõi log:

```bash
docker compose logs -f
```

#### Bước 4 – Truy cập hệ thống

| Dịch vụ | URL |
|---|---|
| **Frontend** | http://localhost:5173 |
| **Backend API** | http://localhost:3000 |
| **Health Check** | http://localhost:3000/api/health |

#### Các lệnh Docker hữu ích

```bash
# Dừng tất cả services
docker compose down

# Dừng và xóa toàn bộ dữ liệu (volume)
docker compose down -v

# Khởi động lại một service cụ thể
docker compose restart backend

# Xem log của một service
docker compose logs -f backend
docker compose logs -f frontend

# Rebuild một service cụ thể
docker compose up --build backend
```

---

## 🧪 Chạy kiểm thử

### Backend – Unit Tests

```bash
cd backend

# Chạy một lần
npm test

# Chạy ở chế độ watch
npm run test:watch
```

### Frontend – Unit Tests

```bash
cd frontend

# Chạy một lần
npm test
```

### Lint (kiểm tra code style)

```bash
# Backend
cd backend && npm run lint

# Frontend
cd frontend && npm run lint
```

---

## ⚙️ CI/CD Pipeline (GitHub Actions)

Pipeline tự động chạy khi push/PR vào nhánh `develop` hoặc `main`:

```
Push/PR
  │
  ├── 🔧 Backend CI      → Install → Lint → Unit Test → Verify
  │
  ├── 🎨 Frontend CI     → Install → Lint → Unit Test → Build
  │
  ├── 🧪 Integration Test → PostgreSQL service → Apply Schema → Smoke Test (/api/health)
  │
  └── 🐳 Docker Build & Push (chỉ khi push, không phải PR)
        └── Push image lên GitHub Container Registry (ghcr.io)
```

---

## 📁 Cấu trúc thư mục

```
Dev_ops_quanlykho/
├── .github/
│   └── workflows/
│       └── ci.yml              # GitHub Actions CI/CD pipeline
├── backend/
│   ├── src/
│   │   ├── app.js              # Entry point
│   │   ├── controllers/        # Xử lý request/response
│   │   ├── services/           # Business logic
│   │   ├── repositories/       # Truy vấn database
│   │   ├── routes/             # Định nghĩa API routes
│   │   ├── middlewares/        # Auth, Error handler
│   │   ├── db/                 # Kết nối DB, Seed data
│   │   ├── utils/              # Tiện ích dùng chung
│   │   └── tests/              # Unit tests
│   ├── Dockerfile
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── pages/              # Các trang chính
│   │   ├── component/          # Reusable components
│   │   ├── contexts/           # React Context (Auth...)
│   │   ├── routes/             # Định nghĩa routes
│   │   ├── lib/                # API client, helpers
│   │   └── data/               # Static data
│   ├── Dockerfile
│   ├── package.json
│   └── .env.example
├── docker-compose.yml          # Orchestration toàn hệ thống
├── wareflow_schema.sql         # Schema khởi tạo database
└── .env.example                # Mẫu biến môi trường (Docker)
```

---

## 🐛 Xử lý sự cố thường gặp

**Backend không kết nối được database:**
```bash
# Kiểm tra service db đã chạy chưa
docker compose ps

# Xem log database
docker compose logs db
```

**Port đã bị chiếm dụng:**
```bash
# Đổi port trong .env
BACKEND_PORT=3001
FRONTEND_PORT=5174
```

**Cần reset toàn bộ dữ liệu:**
```bash
docker compose down -v
docker compose up --build
```

---

## 📄 License

MIT © 2025 WareFlow Team
