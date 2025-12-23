# Backend (Express + MySQL + MinIO)

这个后端服务用于图书管理：MySQL 存数据、MinIO 存文件。

## 运行前你需要准备

- MySQL 已创建数据库（默认 `book`）并建好表/导入数据
- MinIO 已启动，并创建 bucket（默认 `book-files`）

> 生产环境不建议让后端自动创建 bucket。你可以把 `MINIO_AUTO_CREATE_BUCKET=false` 保持默认，然后在 MinIO 控制台/客户端手动建 bucket。

## 环境变量

参考 `.env.example`。

最少需要配置：

- `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME`
- `MINIO_ENDPOINT` / `MINIO_PORT` / `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` / `MINIO_BUCKET`
- `PORT`

可选：

- `CORS_ORIGIN`：生产建议设置为你的域名，多个用逗号分隔
- `MINIO_AUTO_CREATE_BUCKET=true`：仅在你确认 MinIO 凭证有创建 bucket 权限时开启

## 本地开发运行

```sh
npm install
npm run dev
```

默认端口：`http://localhost:3000`

## 建议的线上反代方式（Nginx）

前端请求统一走同源 `/api`：

- 浏览器访问：`https://yourdomain.com/api/books`
- Nginx 转发到后端：`http://127.0.0.1:3000/books`

也就是 Nginx 把 `/api` 前缀去掉转发。

## 健康检查

- `GET /health`：返回 `{ ok: true }`
