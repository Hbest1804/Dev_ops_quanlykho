# Quản Lý Kho

1. Tạo file .env từ .env.example:
ADMIN_EMAIL= 
ADMIN_PASSWORD=
ADMIN_NAME=
3 cái này là để tạo tài khoản admin khi khởi động server.
2.  CHạy lệnh này:
docker compose down -v (xóa database cũ nếu đã có)
docker compose up -d --build
(khởi động lại server và database, đồng thời tạo tài khoản admin nếu chưa có)
3. truy cập http://localhost:5173/login
4. sử dụng tài khoản admin đã tạo để đăng nhập
Lưu ý sử dụng 1 .env cho cả backend và frontend
