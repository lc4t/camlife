# CamLife 生产环境部署指南

本文档介绍如何使用 Docker Compose 在生产环境部署 CamLife。

## 📋 目录

- [前置要求](#前置要求)
- [快速开始](#快速开始)
- [镜像说明](#镜像说明)
- [环境变量配置](#环境变量配置)
- [部署步骤](#部署步骤)
- [域名配置](#域名配置)
- [本地测试](#本地测试)
- [维护与更新](#维护与更新)
- [故障排查](#故障排查)

## 前置要求

### 系统要求

- Docker 20.10+ 
- Docker Compose 2.0+
- 至少 2GB 可用内存
- 至少 10GB 可用磁盘空间

### 必需服务

1. **PostgreSQL 数据库**（已包含在 docker-compose 中）
2. **对象存储服务**（Cloudflare R2 / AWS S3 / Vercel Blob）
   - 用于存储上传的照片
   - 详细配置请参考 [STORAGE-SETUP.md](./STORAGE-SETUP.md)

## 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/lc4t/camlife.git
cd camlife
```

### 2. 配置环境变量

```bash
# 复制环境变量示例文件
cp .env.example .env

# 编辑环境变量文件
nano .env  # 或使用你喜欢的编辑器
```

**重要：** 必须配置以下环境变量：

- `POSTGRES_PASSWORD` - 数据库密码（请使用强密码，必需！）
- `DATABASE_URL` - 数据库连接字符串（必须与 POSTGRES_PASSWORD 一致）
- `STORAGE_PROVIDER` - 存储服务提供商
- `CLOUDFLARE_R2_*` - Cloudflare R2 配置（如果使用 R2）
- `CLOUDFLARE_R2_PUBLIC_URL` - 公共访问 URL（必需）

**注意：** 如果 `POSTGRES_PASSWORD` 未设置，docker-compose 会显示警告并可能启动失败。

详细配置说明请参考 [环境变量配置](#环境变量配置) 章节。

### 3. 启动服务

```bash
# 使用生产环境配置启动
docker-compose -f docker-compose.prod.yml up -d
```

### 4. 验证部署

```bash
# 查看服务状态
docker-compose -f docker-compose.prod.yml ps

# 查看日志
docker-compose -f docker-compose.prod.yml logs -f web
```

访问 `http://localhost:3000` 或配置的域名，确认应用正常运行。

## 镜像说明

### 镜像地址

生产环境使用以下镜像：

- **Web 应用镜像**: `ghcr.io/lc4t/camlife-dev:latest`
- **PostgreSQL**: `postgres:16-alpine`

### 镜像获取

镜像通过 GitHub Actions 自动构建并推送到 GitHub Container Registry (ghcr.io)。

#### 自动获取（推荐）

使用 `docker-compose.prod.yml` 时，Docker 会自动从 ghcr.io 拉取最新镜像：

```bash
docker-compose -f docker-compose.prod.yml pull
```

**如果遇到权限错误，请参考下方"镜像访问权限"部分。**

#### 手动拉取

```bash
# 登录 GitHub Container Registry（首次使用需要）
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# 拉取镜像
docker pull ghcr.io/lc4t/camlife-dev:latest
```

#### 镜像访问权限

**如果镜像拉取被拒绝（denied），可能的原因：**

1. **镜像尚未构建**
   - 解决方案：使用本地构建（见下方"本地构建验证"）

2. **镜像为私有仓库，需要认证**
   - 创建 GitHub Personal Access Token (PAT)
     - 访问: https://github.com/settings/tokens
     - 权限: `read:packages`
   - 登录 GitHub Container Registry:
     ```bash
     echo $GITHUB_TOKEN | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
     ```

3. **镜像不存在或名称错误**
   - 检查镜像是否存在：访问 https://github.com/lc4t/camlife/packages
   - 或使用本地构建

**配置镜像访问权限（如果镜像为私有）：**

1. 访问 https://github.com/lc4t/camlife/packages
2. 选择 `camlife-dev` 包
3. 点击 "Package settings" → "Manage access"
4. 添加访问权限（公开或添加协作者）

### 镜像构建

镜像通过 GitHub Actions 自动构建，触发条件：

- 推送到 `main` 或 `master` 分支
- 创建版本标签（`v*`）
- 手动触发 workflow

查看构建状态：https://github.com/lc4t/camlife/actions

#### 本地构建验证

在推送到 GitHub 之前，可以在本地验证构建：

**方法一：使用构建脚本（推荐）**

```bash
# 运行本地构建脚本
./scripts/build-image-local.sh
```

**方法二：手动构建**

```bash
# 构建镜像
docker build -f docker/web/Dockerfile -t camlife-web:local .

# 测试运行（需要先启动数据库）
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://postgres:password@host.docker.internal:5432/camlife" \
  -e SKIP_ENV_VALIDATION=true \
  camlife-web:local
```

**方法三：使用 docker-compose 测试**

```bash
# 使用生产配置测试（需要先配置 .env）
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
```

## 环境变量配置

### 必需环境变量

#### 数据库配置

```bash
# PostgreSQL 配置（用于 docker-compose）
POSTGRES_DB=camlife
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password_here  # 请使用强密码

# 注意：DATABASE_URL 会自动从上面的配置生成，无需手动设置
# docker-compose 会自动构建连接字符串

# 认证配置（必需）
BETTER_AUTH_SECRET=your_better_auth_secret_here  # 使用 openssl rand -base64 32 生成
BETTER_AUTH_URL=https://photo.sakanano.moe  # 生产环境使用实际域名
```

#### 存储服务配置

**使用 Cloudflare R2（推荐）**

```bash
STORAGE_PROVIDER=cloudflare-r2
CLOUDFLARE_R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
CLOUDFLARE_R2_BUCKET=your-bucket-name
CLOUDFLARE_R2_REGION=auto
CLOUDFLARE_R2_ACCESS_KEY_ID=your-access-key-id
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your-secret-access-key
CLOUDFLARE_R2_PREFIX=camlife
CLOUDFLARE_R2_PUBLIC_URL=https://your-public-url.com  # 必需！
```

**使用 AWS S3**

```bash
STORAGE_PROVIDER=aws-s3
AWS_S3_BUCKET=your-bucket-name
AWS_S3_REGION=us-east-1
AWS_S3_ACCESS_KEY_ID=your-access-key-id
AWS_S3_SECRET_ACCESS_KEY=your-secret-access-key
AWS_S3_PREFIX=camlife
AWS_S3_PUBLIC_URL=https://your-bucket.s3.amazonaws.com
```

**使用 Vercel Blob**

```bash
STORAGE_PROVIDER=vercel-blob
VERCEL_BLOB_STORE_ID=your-store-id
BLOB_READ_WRITE_TOKEN=your-token
```

### 可选环境变量

```bash
# 注册限制（可选）
# 允许注册的邮箱列表，多个邮箱用逗号分隔
# 如果不设置，默认只允许第一个用户注册
ALLOWED_EMAILS=admin@example.com

# Umami Analytics（可选）
NEXT_PUBLIC_UMAMI_ANALYTICS_ID=your-analytics-id
NEXT_PUBLIC_UMAMI_ANALYTICS_JS=https://analytics.example.com/script.js

# 应用端口（默认 3000）
PORT=3000
```

### 环境变量文件

生产环境使用 `.env` 文件：

```bash
# 复制示例文件
cp .env.example .env

# 编辑配置
nano .env
```

**安全提示：**

- ✅ 将 `.env` 添加到 `.gitignore`（已包含）
- ✅ 使用强密码
- ✅ 定期轮换密钥
- ❌ 不要将 `.env` 提交到版本控制

## 部署步骤

### 完整部署流程

#### 1. 准备环境

```bash
# 克隆仓库
git clone https://github.com/lc4t/camlife.git
cd camlife

# 切换到生产分支
git checkout main
```

#### 2. 配置环境变量

```bash
# 复制并编辑环境变量
cp .env.example .env
nano .env
```

#### 3. 拉取最新镜像

```bash
# 拉取最新镜像
docker-compose -f docker-compose.prod.yml pull
```

**如果镜像拉取失败（denied 错误）：**

- **选项 A：** 使用本地构建（见下方"本地构建验证"）
- **选项 B：** 登录 GitHub Container Registry（见"镜像说明"章节）
- **选项 C：** 如果镜像尚未构建，先构建镜像：
  ```bash
  docker build -f docker/web/Dockerfile -t ghcr.io/lc4t/camlife-dev:latest .
  ```

#### 4. 启动服务

```bash
# 启动所有服务（后台运行）
docker-compose -f docker-compose.prod.yml up -d

# 查看启动日志
docker-compose -f docker-compose.prod.yml logs -f
```

#### 5. 验证部署

```bash
# 检查服务状态
docker-compose -f docker-compose.prod.yml ps

# 检查健康状态
curl http://localhost:3000/api/health
```

#### 6. 初始化数据库

数据库迁移会在服务启动时自动执行。如果需要手动运行：

```bash
# 运行迁移
docker-compose -f docker-compose.prod.yml run --rm migration
```

#### 7. 创建管理员账户

```bash
# 进入 web 容器
docker-compose -f docker-compose.prod.yml exec web bash

# 运行初始化脚本（如果存在）
bun run scripts/init-account.ts
```

## 域名配置

### 使用域名 photo.sakanano.moe

#### 1. DNS 配置

在 DNS 提供商处添加 A 记录：

```
类型: A
主机: photo
值: 你的服务器 IP 地址
TTL: 3600
```

#### 2. 本地测试（使用 hosts 文件）

在部署到生产环境之前，可以在本地使用 hosts 文件测试：

**macOS / Linux:**

```bash
# 编辑 hosts 文件
sudo nano /etc/hosts

# 添加以下行
127.0.0.1 photo.sakanano.moe
```

**Windows:**

```powershell
# 以管理员身份运行 PowerShell
notepad C:\Windows\System32\drivers\etc\hosts

# 添加以下行
127.0.0.1 photo.sakanano.moe
```

#### 3. 配置反向代理（推荐使用 Nginx）

创建 Nginx 配置文件 `/etc/nginx/sites-available/camlife`:

```nginx
server {
    listen 80;
    server_name photo.sakanano.moe;

    # 重定向到 HTTPS（如果已配置 SSL）
    # return 301 https://$server_name$request_uri;

    # 如果使用 HTTP（仅测试环境）
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# HTTPS 配置（生产环境推荐）
server {
    listen 443 ssl http2;
    server_name photo.sakanano.moe;

    # SSL 证书配置（使用 Let's Encrypt）
    ssl_certificate /etc/letsencrypt/live/photo.sakanano.moe/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/photo.sakanano.moe/privkey.pem;

    # SSL 优化配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

启用配置：

```bash
# 创建符号链接
sudo ln -s /etc/nginx/sites-available/camlife /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重载 Nginx
sudo systemctl reload nginx
```

#### 4. 配置 SSL 证书（Let's Encrypt）

```bash
# 安装 Certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d photo.sakanano.moe

# 自动续期（已自动配置）
sudo certbot renew --dry-run
```

## 本地测试

### 使用本地 hosts 测试域名

1. **配置 hosts 文件**（见上方）

2. **启动服务**

```bash
docker-compose -f docker-compose.prod.yml up -d
```

3. **访问应用**

在浏览器中访问：`http://photo.sakanano.moe:3000`

或配置 Nginx 后访问：`http://photo.sakanano.moe`

### 测试检查清单

- [ ] 服务正常启动
- [ ] 数据库连接正常
- [ ] 可以访问首页
- [ ] 可以上传照片
- [ ] 照片可以正常显示
- [ ] 地图功能正常
- [ ] 用户认证功能正常

## 维护与更新

### 更新应用

```bash
# 1. 拉取最新代码
git pull origin main

# 2. 拉取最新镜像
docker-compose -f docker-compose.prod.yml pull

# 3. 重启服务
docker-compose -f docker-compose.prod.yml up -d

# 4. 查看日志确认更新成功
docker-compose -f docker-compose.prod.yml logs -f web
```

### 备份数据库

```bash
# 创建备份
docker-compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U postgres camlife > backup_$(date +%Y%m%d_%H%M%S).sql

# 恢复备份
docker-compose -f docker-compose.prod.yml exec -T postgres \
  psql -U postgres camlife < backup_20240101_120000.sql
```

### 查看日志

```bash
# 查看所有服务日志
docker-compose -f docker-compose.prod.yml logs -f

# 查看特定服务日志
docker-compose -f docker-compose.prod.yml logs -f web
docker-compose -f docker-compose.prod.yml logs -f postgres

# 查看最近 100 行日志
docker-compose -f docker-compose.prod.yml logs --tail=100 web
```

### 停止服务

```bash
# 停止服务（保留数据）
docker-compose -f docker-compose.prod.yml stop

# 停止并删除容器（保留数据卷）
docker-compose -f docker-compose.prod.yml down

# 停止并删除所有数据（危险！）
docker-compose -f docker-compose.prod.yml down -v
```

## 故障排查

### 常见问题

#### 1. 服务无法启动

```bash
# 检查服务状态
docker-compose -f docker-compose.prod.yml ps

# 查看错误日志
docker-compose -f docker-compose.prod.yml logs web

# 检查端口占用
netstat -tulpn | grep 3000
```

#### 2. 数据库连接失败

```bash
# 检查数据库服务
docker-compose -f docker-compose.prod.yml ps postgres

# 检查数据库日志
docker-compose -f docker-compose.prod.yml logs postgres

# 测试数据库连接
docker-compose -f docker-compose.prod.yml exec postgres \
  psql -U postgres -d camlife -c "SELECT 1;"
```

#### 3. 镜像拉取失败

```bash
# 检查网络连接
ping ghcr.io

# 手动登录 GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# 检查镜像权限
# 访问 https://github.com/lc4t/camlife/packages
```

#### 4. 照片上传失败

- 检查存储服务配置是否正确
- 检查 `CLOUDFLARE_R2_PUBLIC_URL` 是否配置
- 查看应用日志中的错误信息

#### 5. 迁移失败

```bash
# 手动运行迁移
docker-compose -f docker-compose.prod.yml run --rm migration

# 检查迁移文件
docker-compose -f docker-compose.prod.yml exec web ls -la /app/drizzle
```

### 获取帮助

如果遇到问题，可以：

1. 查看 [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
2. 查看 GitHub Issues: https://github.com/lc4t/camlife/issues
3. 查看应用日志：`docker-compose -f docker-compose.prod.yml logs -f`

## 安全建议

1. **使用强密码**：数据库密码、API 密钥等
2. **启用 HTTPS**：使用 Let's Encrypt 配置 SSL 证书
3. **定期更新**：保持 Docker 镜像和系统更新
4. **备份数据**：定期备份数据库
5. **限制访问**：使用防火墙限制不必要的端口访问
6. **监控日志**：定期检查应用日志，发现异常

## 相关文档

- [STORAGE-SETUP.md](./STORAGE-SETUP.md) - 存储服务配置指南
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - 故障排查指南
- [README.md](./README.md) - 项目说明

