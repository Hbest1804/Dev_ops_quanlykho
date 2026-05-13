# WareFlow - Hệ thống quản lý kho

WareFlow là ứng dụng quản lý kho gồm frontend React, backend Express và PostgreSQL. Hệ thống hỗ trợ quản lý sản phẩm, tồn kho, phiếu nhập, phiếu xuất, báo cáo và phân quyền người dùng.

[![CI Pipeline](https://github.com/Hbest1804/Dev_ops_quanlykho/actions/workflows/ci.yml/badge.svg)](https://github.com/Hbest1804/Dev_ops_quanlykho/actions/workflows/ci.yml)

## Tổng quan

```text
Browser
  -> Frontend: React + TypeScript + Vite + TailwindCSS
  -> Backend: Node.js 22 + Express 5 + JWT
  -> Database: PostgreSQL 17
```

| Thành phần | Công nghệ | Port mặc định |
| --- | --- | --- |
| Frontend | React 19, TypeScript, Vite 8, TailwindCSS v4 | 5173 dev, 80 prod |
| Backend | Node.js 22, Express 5, Vitest, ESLint | 3000 |
| Database | PostgreSQL 17 | 5432 |
| Reverse proxy prod | Nginx | 80 |

## Chức năng chính

- Đăng nhập, đăng xuất, refresh token bằng JWT/cookie.
- Quản lý người dùng và khóa/mở khóa tài khoản.
- Quản lý sản phẩm, trạng thái tồn kho và mức tồn tối thiểu.
- Tạo, xác nhận, hủy phiếu nhập kho.
- Tạo, xác nhận, hủy phiếu xuất kho.
- Dashboard, báo cáo tổng hợp, xuất file PDF/Excel.

## Yêu cầu

- Node.js 22.x
- npm 10.x
- Docker 24+
- Docker Compose plugin 2.x
- Git

## Cấu trúc thư mục

```text
.
├── .github/workflows/
│   ├── ci.yml
│   └── cd.yml
├── backend/
│   ├── src/
│   ├── Dockerfile
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   ├── Dockerfile
│   ├── package.json
│   └── .env.example
├── docker-compose.yml
├── production-compose.yml
├── default.conf.template
├── wareflow_schema.sql
└── .env.example
```

## Development

Có hai cách chạy môi trường dev: chạy toàn bộ bằng Docker Compose hoặc chạy từng app bằng npm.

### Cách 1: Docker Compose

Docker Compose sẽ chạy PostgreSQL, backend và frontend. Database được khởi tạo tự động từ `wareflow_schema.sql` trong lần tạo volume đầu tiên.

```bash
cp .env.example .env
```

Cấu hình tối thiểu trong `.env`:

```env
NODE_ENV=development

POSTGRES_PORT=5432
POSTGRES_DB=postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-database-password

ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your-secure-admin-password
ADMIN_NAME=Administrator

JWT_SECRET=your-super-secret-jwt-key-replace-me

BACKEND_PORT=3000
FRONTEND_PORT=5173
```

Khởi động:

```bash
docker compose up --build
```

Chạy nền:

```bash
docker compose up --build -d
```

Truy cập:

| Dịch vụ | URL |
| --- | --- |
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3000 |
| Health check | http://localhost:3000/api/health |

Lệnh Docker thường dùng:

```bash
docker compose ps
docker compose logs -f backend
docker compose logs -f frontend
docker compose restart backend
docker compose down
docker compose down -v
```

`docker compose down -v` sẽ xóa volume PostgreSQL. Lần chạy sau database sẽ được tạo lại từ `wareflow_schema.sql`.

### Cách 2: Chạy thủ công bằng npm

Phù hợp khi muốn chạy backend/frontend riêng và dùng PostgreSQL local hoặc Supabase.

Backend:

```bash
cp backend/.env.example backend/.env
cd backend
npm install
npm run dev
```

Ví dụ `backend/.env`:

```env
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-database-password

JWT_SECRET=your-super-secret-jwt-key-min-64-chars

ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your-secure-admin-password
ADMIN_NAME=Administrator
```

Nếu dùng Supabase, dùng host/user/password từ Supabase và thường dùng `POSTGRES_PORT=6543`.

Khởi tạo schema:

```bash
psql -h <POSTGRES_HOST> -U <POSTGRES_USER> -d <POSTGRES_DB> -f wareflow_schema.sql
```

Frontend:

```bash
cp frontend/.env.example frontend/.env
cd frontend
npm install
npm run dev
```

Ví dụ `frontend/.env`:

```env
BACKEND_URL=http://localhost:3000
VITE_API_URL=
```

Trong development, Vite proxy route `/api` sang `BACKEND_URL`.

## Kiểm tra chất lượng

Backend:

```bash
cd backend
npm run lint
npm test
```

Frontend:

```bash
cd frontend
npm run lint
npm test
npm run build
```

## Production

Production hiện dùng image từ GitHub Container Registry:

- `ghcr.io/hbest1804/quanlykho-backend`
- `ghcr.io/hbest1804/quanlykho-frontend`

`production-compose.yml` chạy 3 service:

- `backend`: API Express.
- `frontend`: Nginx phục vụ static build React.
- `nginx`: reverse proxy public, dùng `default.conf.template`.

### Deploy thủ công trên server

Copy các file cần thiết lên server:

```bash
scp production-compose.yml default.conf.template <user>@<server>:/home/<user>/quanlykho/
```

Tạo file `.env` trong thư mục deploy:

```env
NODE_ENV=production

POSTGRES_HOST=your-postgres-host
POSTGRES_PORT=5432
POSTGRES_DB=postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-database-password

ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your-secure-admin-password
ADMIN_NAME=Administrator

JWT_SECRET=your-production-jwt-secret
CORS_ORIGIN=https://your-web-domain.com

BACKEND_PORT=3000
FRONTEND_PORT=80
NGINX_PORT=80

BACKEND_HOST=backend
FRONTEND_HOST=frontend
API_DOMAIN=api.your-domain.com
WEB_DOMAIN=your-domain.com

BACKEND_IMAGE_TAG=latest
FRONTEND_IMAGE_TAG=latest
```

Khởi động production:

```bash
docker compose -f production-compose.yml pull
docker compose -f production-compose.yml up -d --force-recreate --remove-orphans
```

Xem log:

```bash
docker compose -f production-compose.yml logs -f
```

Dừng production:

```bash
docker compose -f production-compose.yml down --remove-orphans
```

### Deploy tự động bằng GitHub Actions

Workflow production nằm ở `.github/workflows/cd.yml`.

Khi push lên `main`, CD sẽ:

1. Gọi lại CI để lint/test/build.
2. SSH vào VPS.
3. Copy `production-compose.yml` và `default.conf.template`.
4. Tạo `.env` từ GitHub Secrets/Variables.
5. Chạy `docker compose -f production-compose.yml up -d --force-recreate --remove-orphans`.

Secrets cần cấu hình trong GitHub:

| Secret | Mục đích |
| --- | --- |
| `SSH_PRIVATE_KEY` | Private key để SSH vào VPS |
| `VPS_PUBLIC_IP` | IP public của VPS |
| `VPS_USERNAME` | User deploy trên VPS |
| `POSTGRES_HOST` | Host PostgreSQL production |
| `POSTGRES_PORT` | Port PostgreSQL |
| `POSTGRES_DB` | Tên database |
| `POSTGRES_USER` | User database |
| `POSTGRES_PASSWORD` | Password database |
| `ADMIN_EMAIL` | Email admin mặc định |
| `ADMIN_PASSWORD` | Password admin mặc định |
| `ADMIN_NAME` | Tên admin mặc định |
| `JWT_SECRET` | Secret ký JWT |

Variables cần cấu hình:

| Variable | Mục đích |
| --- | --- |
| `CORS_ORIGIN` | Origin frontend production |
| `BACKEND_PORT` | Port nội bộ backend |
| `FRONTEND_PORT` | Port nội bộ frontend |
| `NGINX_PORT` | Port public Nginx |
| `BACKEND_HOST` | Tên service backend, thường là `backend` |
| `FRONTEND_HOST` | Tên service frontend, thường là `frontend` |
| `API_DOMAIN` | Domain API |
| `WEB_DOMAIN` | Domain web |

## CI/CD

CI nằm ở `.github/workflows/ci.yml` và chạy trên push/PR vào `develop` hoặc `main`.

Các job chính:

- Backend lint, unit test.
- Frontend lint, unit test, build.
- Integration test với PostgreSQL service và `/api/health`.
- Docker build/push image lên GHCR khi push.

CD nằm ở `.github/workflows/cd.yml` và chạy khi push vào `main`.

Các thay đổi chỉ trong những path sau sẽ không kích hoạt pipeline tương ứng:

- `.github/workflows/cd.yml`
- `docs/**`
- `backend/README.md` hoặc `backend/readme.md`
- `frontend/README.md` hoặc `frontend/readme.md`

## Xử lý sự cố

Backend không kết nối được database:

```bash
docker compose ps
docker compose logs db
docker compose logs backend
```

Port bị chiếm:

```bash
# đổi trong .env
BACKEND_PORT=3001
FRONTEND_PORT=5174
```

Reset database dev:

```bash
docker compose down -v
docker compose up --build
```

Kiểm tra health:

```bash
curl http://localhost:3000/api/health
```

## License

MIT
