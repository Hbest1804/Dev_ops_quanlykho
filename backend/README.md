# WareFlow Backend

Backend của WareFlow là REST API dùng Node.js 22, Express 5 và PostgreSQL. API phục vụ xác thực, quản lý người dùng, sản phẩm, phiếu nhập/xuất kho và báo cáo.

## Công nghệ

- Node.js 22
- Express 5
- PostgreSQL qua `pg`
- JWT access token và refresh token qua HTTP-only cookie
- Vitest
- ESLint
- Docker multi-stage build

## Biến môi trường

Tạo file `.env` từ mẫu:

```bash
cp .env.example .env
```

Các biến backend đang dùng:

| Biến | Bắt buộc | Mô tả |
| --- | --- | --- |
| `NODE_ENV` | Có | `development` hoặc `production`. Production bật DB SSL và secure cookie. |
| `PORT` | Không | Port backend lắng nghe, mặc định `3000`. |
| `VERCEL` | Không | Set `1` nếu chạy serverless Vercel để app không tự `listen`. |
| `CORS_ORIGIN` | Có | Danh sách origin frontend được phép gọi API, ngăn cách bằng dấu phẩy. |
| `POSTGRES_HOST` | Có | Host PostgreSQL. |
| `POSTGRES_PORT` | Có | Port PostgreSQL, mặc định code fallback `5432`. |
| `POSTGRES_DB` | Có | Tên database. |
| `POSTGRES_USER` | Có | User database. |
| `POSTGRES_PASSWORD` | Có | Password database. |
| `JWT_SECRET` | Có | Secret ký JWT. Dùng chuỗi dài và ngẫu nhiên ở production. |
| `ADMIN_EMAIL` | Khuyến nghị | Email admin mặc định để seed lần đầu. |
| `ADMIN_PASSWORD` | Khuyến nghị | Password admin mặc định để seed lần đầu. |
| `ADMIN_NAME` | Không | Tên admin mặc định, fallback `Administrator`. |

Khi khởi động, backend sẽ kiểm tra kết nối DB và gọi seed admin. Nếu chưa có user role `admin` và có `ADMIN_EMAIL`/`ADMIN_PASSWORD`, hệ thống sẽ tạo admin mặc định.

## Development thủ công

Yêu cầu PostgreSQL local hoặc Supabase đã có schema từ `../wareflow_schema.sql`.

`.env` khuyến nghị cho PostgreSQL local:

```env
NODE_ENV=development
PORT=3000
VERCEL=

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

Cài dependencies và chạy dev server:

```bash
npm install
npm run dev
```

Backend chạy tại:

```text
http://localhost:3000
```

Health check:

```bash
curl http://localhost:3000/api/health
```

Khởi tạo schema nếu dùng database ngoài Docker:

```bash
psql -h <POSTGRES_HOST> -U <POSTGRES_USER> -d <POSTGRES_DB> -f ../wareflow_schema.sql
```

Nếu dùng Supabase ở development, đổi nhóm database thành thông tin Supabase. Supabase pooler thường dùng port `6543`.

## Development bằng Docker Compose

Chạy từ thư mục gốc repo:

```bash
docker compose up --build backend
```

Hoặc chạy toàn bộ hệ thống:

```bash
docker compose up --build
```

Trong `docker-compose.yml`, backend dev được override:

```env
NODE_ENV=development
POSTGRES_HOST=db
POSTGRES_PORT=5432
CORS_ORIGIN=http://localhost:5173
```

PostgreSQL service sẽ tự chạy schema từ `wareflow_schema.sql` khi volume được tạo lần đầu.

Xem log:

```bash
docker compose logs -f backend
docker compose logs -f db
```

Reset database dev:

```bash
docker compose down -v
docker compose up --build
```

## Production thủ công

Production backend thường chạy qua `production-compose.yml` ở thư mục gốc repo. Image mặc định:

```text
ghcr.io/hbest1804/quanlykho-backend:<tag>
```

`.env` production tối thiểu:

```env
NODE_ENV=production
PORT=3000

CORS_ORIGIN=https://your-web-domain.com

POSTGRES_HOST=your-postgres-host
POSTGRES_PORT=5432
POSTGRES_DB=postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-database-password

JWT_SECRET=your-production-jwt-secret

ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your-secure-admin-password
ADMIN_NAME=Administrator
```

Lưu ý production:

- `NODE_ENV=production` bật SSL cho kết nối PostgreSQL.
- Refresh token cookie dùng `Secure` và `SameSite=None`, nên cần chạy qua HTTPS ở môi trường thật.
- `CORS_ORIGIN` phải trùng origin frontend public.
- Không commit secret thật vào repository.

Chạy backend image standalone:

```bash
docker build --target production -t wareflow-backend .
docker run --rm -p 3000:3000 --env-file .env wareflow-backend
```

Chạy qua production compose từ thư mục gốc:

```bash
docker compose -f production-compose.yml up -d backend
```

## Production bằng CD

Workflow `.github/workflows/cd.yml` tạo file `.env` trên VPS từ GitHub Secrets/Variables rồi chạy:

```bash
docker compose -f production-compose.yml up -d --force-recreate --remove-orphans
```

Secrets backend cần có:

| Secret | Mục đích |
| --- | --- |
| `POSTGRES_HOST` | Host PostgreSQL production |
| `POSTGRES_PORT` | Port PostgreSQL |
| `POSTGRES_DB` | Tên database |
| `POSTGRES_USER` | User database |
| `POSTGRES_PASSWORD` | Password database |
| `ADMIN_EMAIL` | Email admin mặc định |
| `ADMIN_PASSWORD` | Password admin mặc định |
| `ADMIN_NAME` | Tên admin mặc định |
| `JWT_SECRET` | Secret ký JWT |

Variables liên quan:

| Variable | Mục đích |
| --- | --- |
| `CORS_ORIGIN` | Origin frontend production |
| `BACKEND_PORT` | Port nội bộ backend |

## Scripts

```bash
npm run dev        # chạy nodemon
npm start          # chạy node src/app.js
npm run lint       # chạy ESLint
npm test           # chạy Vitest một lần
npm run test:watch # chạy Vitest watch mode
```

## Kiểm tra trước khi merge

```bash
npm run lint
npm test
```

## API health

Backend expose hai endpoint health:

```text
GET /health
GET /api/health
```
