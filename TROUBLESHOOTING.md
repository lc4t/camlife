# 故障排除指南

## 存储上传问题

### 问题：ECONNREFUSED 错误

**症状**：
```
Upload failed: ECONNREFUSED
Unable to connect. Is the computer able to access the url?
```

**可能原因**：

1. **Docker 容器网络问题**
   - 容器无法访问外部网络
   - DNS 解析失败

2. **环境变量未正确加载**
   - `.env.local` 文件中的值没有传递到容器
   - 容器需要重启以加载新的环境变量

3. **Endpoint URL 配置错误**
   - Endpoint 格式不正确
   - Account ID 错误

**解决方案**：

#### 步骤 1: 验证环境变量

```bash
# 检查本地文件
cat .env.local | grep CLOUDFLARE_R2_ENDPOINT

# 检查容器内的环境变量
docker-compose -f docker-compose-dev.yml exec web env | grep CLOUDFLARE_R2_ENDPOINT
```

如果容器内的值不正确，需要完全重建容器：

```bash
docker-compose -f docker-compose-dev.yml down
docker-compose -f docker-compose-dev.yml up -d --build --force-recreate
```

#### 步骤 2: 检查环境变量和配置

检查环境变量是否正确设置：
```bash
# 检查本地文件
cat .env.local | grep CLOUDFLARE_R2

# 检查容器内的环境变量
docker-compose -f docker-compose-dev.yml exec web env | grep CLOUDFLARE_R2
```

#### 步骤 3: 检查 Docker 网络

```bash
# 检查容器网络
docker-compose -f docker-compose-dev.yml ps

# 检查容器日志
docker-compose -f docker-compose-dev.yml logs web | tail -50
```

#### 步骤 4: 验证 Endpoint URL

确保 `CLOUDFLARE_R2_ENDPOINT` 格式正确：
```
✅ 正确: https://4ca01ebe86b44be3f0530699298c56ec.r2.cloudflarestorage.com
❌ 错误: https://r2.cloudflarestorage.com
❌ 错误: 4ca01ebe86b44be3f0530699298c56ec.r2.cloudflarestorage.com (缺少协议)
```

#### 步骤 5: 如果仍然失败

如果以上步骤都正确，但仍有连接问题，可能是：

1. **Docker Desktop 网络配置问题**
   - 检查 Docker Desktop 的网络设置
   - 尝试重启 Docker Desktop

2. **防火墙/代理问题**
   - 检查系统防火墙设置
   - 如果使用代理，确保 Docker 可以访问外部网络

3. **使用服务器端代理（推荐）**
   - 应用默认使用服务器端代理上传
   - 这完全绕过 CORS 和网络连接问题
   - 确保 `.env.local` 中**没有**设置 `NEXT_PUBLIC_USE_UPLOAD_PROXY=false`

## 快速诊断命令

```bash
# 1. 检查环境变量
docker-compose -f docker-compose-dev.yml exec web env | grep CLOUDFLARE

# 2. 查看容器日志
docker-compose -f docker-compose-dev.yml logs web --tail 100

# 3. 完全重建容器
docker-compose -f docker-compose-dev.yml down
docker-compose -f docker-compose-dev.yml up -d --build --force-recreate
```

## 常见错误码

- **ECONNREFUSED**: 连接被拒绝，通常是网络或 DNS 问题
- **ENOTFOUND**: DNS 解析失败，检查 endpoint URL
- **Access Denied / Forbidden**: 权限不足或凭证错误
  - 检查 API Token 是否有 "Object Read & Write" 权限
  - 检查 API Token 是否应用到正确的存储桶
  - 检查 Access Key ID 和 Secret Access Key 是否正确
- **InvalidAccessKeyId**: Access Key ID 错误
- **SignatureDoesNotMatch**: Secret Access Key 错误
- **NoSuchBucket**: 存储桶名称错误或不存在

## 问题：Access Denied 错误

**症状**：
```
Access Denied
S3ServiceException
```

**原因**：
这是权限问题，不是网络问题。通常是因为：
1. API Token 权限不足
2. API Token 没有应用到正确的存储桶
3. Access Key ID 或 Secret Access Key 错误

**解决方案**：

### 步骤 1: 检查 API Token 权限

1. 登录 Cloudflare Dashboard
2. 进入 **R2** → **Manage R2 API Tokens**
3. 找到您使用的 API Token
4. 确保权限设置为：
   - ✅ **Object Read & Write**
   - ✅ **应用到正确的存储桶**（选择 "Apply to specific buckets only" 并选择您的存储桶）

### 步骤 2: 验证存储桶名称

确保 `.env.local` 中的 `CLOUDFLARE_R2_BUCKET` 与 API Token 中配置的存储桶名称完全一致（区分大小写）。

### 步骤 3: 重新创建 API Token（如果需要）

如果权限配置正确但仍然失败，尝试创建新的 API Token：

1. 在 Cloudflare Dashboard 中创建新的 API Token
2. 选择 **Object Read & Write** 权限
3. 选择 **Apply to specific buckets only**
4. 选择您的存储桶
5. 复制新的 **Access Key ID** 和 **Secret Access Key**
6. 更新 `.env.local` 文件
7. 重启容器：
   ```bash
   docker-compose -f docker-compose-dev.yml restart web
   ```

### 步骤 4: 验证凭证

检查凭证配置：
```bash
# 验证环境变量是否设置
docker-compose -f docker-compose-dev.yml exec web env | grep CLOUDFLARE_R2

# 检查存储桶名称是否正确
docker-compose -f docker-compose-dev.yml exec web env | grep CLOUDFLARE_R2_BUCKET
```

如果仍然显示 "Access Denied"，检查：
- Access Key ID 和 Secret Access Key 是否与 API Token 中的完全一致
- 是否有额外的空格或换行符
- 存储桶名称是否正确

