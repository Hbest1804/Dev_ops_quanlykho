# WareFlow Frontend

Frontend của WareFlow được xây dựng bằng React 19, TypeScript, Vite 8 và TailwindCSS v4. Ứng dụng gọi backend qua route `/api` trong môi trường Docker/nginx hoặc qua Vite proxy khi chạy dev thủ công.

## Công nghệ

- React 19
- TypeScript
- Vite 8
- TailwindCSS v4
- React Router DOM v7
- Axios
- Vitest
- ESLint

## Biến môi trường

Tạo file `.env` từ mẫu:

```bash
cp .env.example .env
```

Các biến frontend đang dùng:

| Biến | Dùng khi | Mô tả |
| --- | --- | --- |
| `BACKEND_URL` | Dev thủ công hoặc Docker dev | URL backend cho Vite proxy. Không được expose vào browser. |
| `VITE_API_URL` | Build frontend standalone | Base URL public của backend. Nếu để trống, frontend gọi API qua `/api`. |
| `FRONTEND_PORT` | Docker production image | Port Nginx trong container frontend production. |

Mặc định nên để `VITE_API_URL=` khi chạy trong repo này, vì dev dùng Vite proxy và production dùng nginx reverse proxy `/api`.

## Development thủ công

Yêu cầu backend đang chạy tại `http://localhost:3000`.

`.env` khuyến nghị:

```env
NODE_ENV=development
BACKEND_URL=http://localhost:3000
VITE_API_URL=
FRONTEND_PORT=5173
```

Cài dependencies và chạy dev server:

```bash
npm install
npm run dev
```

Frontend chạy tại:

```text
http://localhost:5173
```

Khi gọi `/api/*`, Vite sẽ proxy sang `BACKEND_URL`.

## Development bằng Docker Compose

Chạy từ thư mục gốc repo:

```bash
docker compose up --build frontend
```

Hoặc chạy toàn bộ hệ thống:

```bash
docker compose up --build
```

Trong `docker-compose.yml`, frontend dev dùng:

```env
BACKEND_URL=http://backend:3000
```

Không cần set `VITE_API_URL` cho Docker dev. Vite proxy sẽ forward `/api` sang service backend trong network Docker.

## Production build thủ công

Nếu frontend được phục vụ cùng domain với reverse proxy `/api`, giữ `VITE_API_URL` trống:

```env
NODE_ENV=production
VITE_API_URL=
```

Build:

```bash
npm ci
npm run build
```

Preview local:

```bash
npm run preview
```

Nếu deploy frontend standalone, ví dụ frontend và backend khác domain, set `VITE_API_URL` trước khi build:

```env
NODE_ENV=production
VITE_API_URL=https://api.example.com
```

Khi đó Axios sẽ gọi:

```text
https://api.example.com/api
```

## Production bằng Docker

Build production image:

```bash
docker build --target production -t wareflow-frontend .
```

Run standalone:

```bash
docker run --rm -p 8080:80 -e FRONTEND_PORT=80 wareflow-frontend
```

Trong production chính của repo, frontend image được chạy bởi `production-compose.yml` từ thư mục gốc:

```bash
docker compose -f production-compose.yml up -d frontend
```

Production compose dùng nginx reverse proxy ở service `nginx`, nên frontend vẫn gọi API qua `/api` cùng origin. Vì vậy image frontend production mặc định không cần `VITE_API_URL`.

## Scripts

```bash
npm run dev      # chạy Vite dev server
npm run build    # build production
npm run preview  # preview dist local
npm run lint     # chạy ESLint
npm test         # chạy Vitest
```

## Kiểm tra trước khi merge

```bash
npm run lint
npm test
npm run build
```
