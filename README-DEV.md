# 本地开发环境设置指南

本文档说明如何使用 Docker Compose 在本地进行开发。

## 前置要求

- Docker 和 Docker Compose 已安装
- 已创建 `.env.local` 文件（参考 `.env.local.example`）

## 快速开始

### 方法一：使用启动脚本（推荐）

```bash
# 启动所有服务（会自动检查并创建 .env.local）
./scripts/dev-start.sh

# 启动并运行数据库迁移
./scripts/dev-start.sh --migrate
```

### 方法二：手动启动

#### 1. 创建环境变量文件

```bash
cp env.local.example .env.local
```

然后编辑 `.env.local` 文件，填入必要的配置（主要是存储服务配置，地图功能无需配置）。

#### 2. 启动开发环境

```bash
# 启动所有服务（数据库 + 迁移 + Web 应用）
# 迁移会自动在 Web 应用启动前运行
docker-compose -f docker-compose-dev.yml up -d

# 查看日志
docker-compose -f docker-compose-dev.yml logs -f web

# 如果需要单独重新运行数据库迁移
docker-compose -f docker-compose-dev.yml up migration
```

### 3. 访问应用

- Web 应用: http://localhost:3000
- PostgreSQL 数据库: localhost:5432
  - 数据库名: `camlife_dev`
  - 用户名: `postgres`
  - 密码: `postgres_dev_password`

## 常用命令

### 启动服务

```bash
# 后台启动所有服务
docker-compose -f docker-compose-dev.yml up -d

# 前台启动（查看日志）
docker-compose -f docker-compose-dev.yml up

# 只启动数据库
docker-compose -f docker-compose-dev.yml up -d postgres
```

### 停止服务

```bash
# 停止所有服务
docker-compose -f docker-compose-dev.yml down

# 停止并删除数据卷（⚠️ 会删除数据库数据）
docker-compose -f docker-compose-dev.yml down -v
```

### 查看日志

```bash
# 查看所有服务日志
docker-compose -f docker-compose-dev.yml logs -f

# 查看 Web 应用日志
docker-compose -f docker-compose-dev.yml logs -f web

# 查看数据库日志
docker-compose -f docker-compose-dev.yml logs -f postgres
```

### 数据库操作

```bash
# 连接到数据库
docker-compose -f docker-compose-dev.yml exec postgres psql -U postgres -d camlife_dev

# 运行数据库迁移（迁移通常会自动运行，但可以手动触发）
docker-compose -f docker-compose-dev.yml up migration

# 重置数据库（删除数据卷后重新启动）
docker-compose -f docker-compose-dev.yml down -v
docker-compose -f docker-compose-dev.yml up -d
# 迁移会自动运行
```

### 进入容器

```bash
# 进入 Web 容器
docker-compose -f docker-compose-dev.yml exec web sh

# 进入数据库容器
docker-compose -f docker-compose-dev.yml exec postgres sh
```

### 重新构建

```bash
# 重新构建 Web 应用镜像
docker-compose -f docker-compose-dev.yml build web

# 重新构建所有镜像
docker-compose -f docker-compose-dev.yml build

# 重新构建并启动
docker-compose -f docker-compose-dev.yml up -d --build
```

## 开发特性

### 热重载

代码修改后会自动重新加载，无需重启容器。

### 数据库持久化

数据库数据存储在 Docker 卷 `camlife_postgres_dev_data` 中，即使停止容器数据也不会丢失。

### 环境隔离

开发环境使用独立的：
- 数据库名: `camlife_dev`（与生产环境 `camlife` 分离）
- 数据卷: `camlife_postgres_dev_data`（与生产环境分离）
- 网络: `camlife_dev_network`（与生产环境分离）

## 故障排除

### 端口被占用

如果 3000 或 5432 端口被占用，可以修改 `docker-compose-dev.yml` 中的端口映射：

```yaml
ports:
  - "3001:3000"  # 将本地 3001 映射到容器 3000
```

### 数据库连接失败

1. 检查数据库容器是否正常运行：
   ```bash
   docker-compose -f docker-compose-dev.yml ps postgres
   ```

2. 检查数据库健康状态：
   ```bash
   docker-compose -f docker-compose-dev.yml exec postgres pg_isready -U postgres
   ```

3. 查看数据库日志：
   ```bash
   docker-compose -f docker-compose-dev.yml logs postgres
   ```

### 代码修改不生效

1. 确保代码目录已正确挂载（检查 `docker-compose-dev.yml` 中的 volumes 配置）
2. 检查文件权限
3. 尝试重启容器：
   ```bash
   docker-compose -f docker-compose-dev.yml restart web
   ```

### 构建失败：lockfile 不同步

如果遇到 `lockfile had changes, but lockfile is frozen` 错误：

1. 在本地更新 lockfile：
   ```bash
   bun install
   ```

2. 提交更新后的 `bun.lock` 文件（如果适用）

3. 重新构建镜像：
   ```bash
   docker-compose -f docker-compose-dev.yml build --no-cache web
   ```

   或者直接启动（会自动重新构建）：
   ```bash
   docker-compose -f docker-compose-dev.yml up -d --build
   ```

### 环境变量不生效

1. 确保 `.env.local` 文件存在且格式正确
2. 重启容器以加载新的环境变量：
   ```bash
   docker-compose -f docker-compose-dev.yml restart web
   ```

### 数据库表不存在错误

如果遇到 `Failed query: select ... from "settings"` 等错误，说明数据库迁移未运行：

1. **自动迁移**：正常情况下，迁移会在 web 服务启动前自动运行。如果失败，检查迁移日志：
   ```bash
   docker-compose -f docker-compose-dev.yml logs migration
   ```

2. **手动运行迁移**：
   ```bash
   docker-compose -f docker-compose-dev.yml up migration
   ```

3. **重新启动所有服务**（会重新运行迁移）：
   ```bash
   docker-compose -f docker-compose-dev.yml down
   docker-compose -f docker-compose-dev.yml up -d
   ```

4. **检查数据库表是否创建**：
   ```bash
   docker-compose -f docker-compose-dev.yml exec postgres psql -U postgres -d camlife_dev -c "\dt"
   ```

## 与生产环境的区别

| 特性 | 开发环境 (docker-compose-dev.yml) | 生产环境 (docker-compose.yml) |
|------|----------------------------------|------------------------------|
| 数据库名 | `camlife_dev` | `camlife` |
| 数据库密码 | `postgres_dev_password` | `password` |
| Web 模式 | 开发模式（热重载） | 生产模式（构建后运行） |
| 代码挂载 | 是（实时同步） | 否（构建到镜像） |
| 数据卷 | `camlife_postgres_dev_data` | `postgres_data` |
| 网络 | `camlife_dev_network` | `camlife_network` |

## 注意事项

1. **不要提交 `.env.local`** - 此文件包含敏感信息，已在 `.gitignore` 中
2. **开发数据库独立** - 开发环境使用独立的数据库，不会影响生产数据
3. **数据持久化** - 使用 `down -v` 会删除所有数据，请谨慎操作
4. **资源使用** - 开发模式会消耗更多资源，建议在开发完成后停止容器

