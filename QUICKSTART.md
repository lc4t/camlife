# CamLife 快速启动指南

本指南帮助您快速启动 CamLife，包括首次部署和本地测试。

## 🚀 快速开始

### 步骤 1: 配置环境变量

```bash
# 复制环境变量示例文件
cp .env.example .env

# 编辑环境变量文件（至少需要配置数据库密码）
nano .env
```

**最小配置要求：**

```bash
# 数据库配置（必需）
POSTGRES_DB=camlife
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password_here

# 注意：DATABASE_URL 会自动从上面的配置生成，无需手动设置

# 认证配置（必需）
BETTER_AUTH_SECRET=your_better_auth_secret_here
BETTER_AUTH_URL=http://localhost:3000

# 存储服务配置（必需）
STORAGE_PROVIDER=cloudflare-r2
CLOUDFLARE_R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
CLOUDFLARE_R2_BUCKET=your-bucket-name
CLOUDFLARE_R2_ACCESS_KEY_ID=your-access-key-id
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your-secret-access-key
CLOUDFLARE_R2_PUBLIC_URL=https://your-public-url.com
```

### 步骤 2: 获取 Docker 镜像

#### 选项 A: 使用 GitHub Actions 构建的镜像（推荐）

**如果镜像已构建并公开：**

```bash
# 直接拉取镜像
docker-compose pull
```

**如果镜像需要认证（私有仓库）：**

```bash
# 1. 创建 GitHub Personal Access Token (PAT)
#    访问: https://github.com/settings/tokens
#    权限: read:packages

# 2. 登录 GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin

# 3. 拉取镜像
docker-compose pull
```

#### 选项 B: 本地构建镜像（镜像未构建或需要测试时）

```bash
# 方法 1: 使用构建脚本
./scripts/build-image-local.sh

# 方法 2: 手动构建
docker build -f docker/web/Dockerfile -t ghcr.io/lc4t/camlife-dev:latest .

# 然后修改 docker-compose.prod.yml，使用本地构建的镜像
# 或者直接使用本地标签
```

**临时使用本地构建的镜像：**

创建 `docker-compose.local.yml`:

```yaml
services:
  migration:
    build:
      context: .
      dockerfile: docker/web/Dockerfile
    image: camlife-web:local
    command: bun run scripts/drizzle-migrate.ts
    # ... 其他配置

  web:
    build:
      context: .
      dockerfile: docker/web/Dockerfile
    image: camlife-web:local
    # ... 其他配置
```

然后使用：

```bash
docker-compose -f docker-compose.yml -f docker-compose.local.yml up -d
```

### 步骤 3: 启动服务

```bash
# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f
```

### 步骤 4: 验证部署

```bash
# 检查服务状态
docker-compose ps

# 检查健康状态
curl http://localhost:3000/api/health
```

## 🔧 常见问题解决

### 问题 1: POSTGRES_PASSWORD 未设置

**错误信息：**
```
WARN[0000] The "POSTGRES_PASSWORD" variable is not set. Defaulting to a blank string.
```

**解决方法：**

1. 确保已创建 `.env` 文件：
   ```bash
   cp .env.example .env
   ```

2. 在 `.env` 中设置 `POSTGRES_PASSWORD`：
   ```bash
   POSTGRES_PASSWORD=your_secure_password_here
   ```

3. 确保 `DATABASE_URL` 中的密码与 `POSTGRES_PASSWORD` 一致：
   ```bash
   DATABASE_URL=postgresql://postgres:your_secure_password_here@postgres:5432/camlife
   ```

### 问题 2: 镜像拉取被拒绝

**错误信息：**
```
Error response from daemon: Head "https://ghcr.io/v2/lc4t/camlife-dev/manifests/latest": denied
```

**可能原因：**

1. **镜像尚未构建**
   - 解决方案：使用本地构建（见步骤 2 选项 B）

2. **镜像为私有仓库，需要认证**
   - 解决方案：登录 GitHub Container Registry（见步骤 2 选项 A）

3. **镜像不存在或名称错误**
   - 检查镜像是否存在：访问 https://github.com/lc4t/camlife/packages
   - 或使用本地构建

**解决方法：**

**方法 1: 本地构建镜像**

```bash
# 构建镜像
docker build -f docker/web/Dockerfile -t ghcr.io/lc4t/camlife-dev:latest .

# 然后启动服务
docker-compose up -d
```

**方法 2: 登录 GitHub Container Registry**

```bash
# 创建 GitHub Personal Access Token
# 访问: https://github.com/settings/tokens
# 权限: read:packages

# 登录
echo $GITHUB_TOKEN | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin

# 拉取镜像
docker-compose pull
```

**方法 3: 修改 docker-compose 使用本地构建**

创建 `docker-compose.override.yml`（此文件会被自动加载）：

```yaml
services:
  migration:
    build:
      context: .
      dockerfile: docker/web/Dockerfile
    image: camlife-web:local

  web:
    build:
      context: .
      dockerfile: docker/web/Dockerfile
    image: camlife-web:local
```

然后运行：

```bash
docker-compose up -d --build
```

### 问题 3: 迁移服务失败

**检查迁移日志：**

```bash
docker-compose logs migration
```

**手动运行迁移：**

```bash
docker-compose run --rm migration
```

## 📝 本地测试（使用 hosts 文件）

### 1. 配置 hosts 文件

**macOS / Linux:**

```bash
sudo nano /etc/hosts
```

添加：

```
127.0.0.1 photo.sakanano.moe
```

**Windows:**

```powershell
# 以管理员身份运行
notepad C:\Windows\System32\drivers\etc\hosts
```

添加：

```
127.0.0.1 photo.sakanano.moe
```

### 2. 启动服务

```bash
docker-compose up -d
```

### 3. 访问应用

在浏览器中访问：`http://photo.sakanano.moe:3000`

或配置 Nginx 反向代理后访问：`http://photo.sakanano.moe`

## 🔄 更新应用

```bash
# 1. 拉取最新代码
git pull

# 2. 拉取最新镜像（如果使用远程镜像）
docker-compose pull

# 3. 或重新构建（如果使用本地构建）
docker-compose up -d --build

# 4. 查看日志
docker-compose logs -f
```

## 📚 更多信息

- 详细部署文档: [DEPLOYMENT.md](./DEPLOYMENT.md)
- 存储服务配置: [STORAGE-SETUP.md](./STORAGE-SETUP.md)
- 故障排查: [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

