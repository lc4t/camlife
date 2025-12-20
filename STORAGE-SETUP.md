# 存储服务配置指南

本指南将帮助您配置 Cloudflare R2 存储服务，以便在本地开发环境中上传照片。

## 为什么需要配置存储？

CamLife 需要将上传的照片存储到云存储服务中。目前支持：
- **Cloudflare R2**（推荐，与 S3 兼容）
- AWS S3
- Vercel Blob

## Cloudflare R2 配置步骤

### 1. 创建 Cloudflare 账户

1. 访问 [Cloudflare](https://dash.cloudflare.com/sign-up)
2. 注册或登录账户

### 2. 创建 R2 存储桶

1. 登录 Cloudflare Dashboard
2. 在左侧菜单选择 **R2**
3. 点击 **Create bucket**（创建存储桶）
4. 输入存储桶名称（例如：`camlife-photos`）
5. 选择位置（建议选择离您最近的区域）
6. 点击 **Create bucket**

### 3. 创建 API Token

1. 在 R2 页面，点击右上角的 **Manage R2 API Tokens**
2. 点击 **Create API token**
3. 配置权限：
   - **Token name**: `camlife-dev`（或您喜欢的名称）
   - **Permissions**: 选择 **Object Read & Write**
   - **TTL**: 留空（永久有效）或设置过期时间
4. 点击 **Create API Token**
5. **重要**：复制并保存以下信息（只显示一次）：
   - **Access Key ID**
   - **Secret Access Key**

### 4. 配置 CORS（仅生产环境需要）

**重要**：本地开发时，应用默认使用**服务器端代理上传**，**不需要配置 CORS**！

#### 本地开发（推荐：使用服务器端代理）

本地开发时，应用会自动使用服务器端代理上传，完全绕过 CORS 限制：
- ✅ 无需配置 CORS
- ✅ 更安全（凭证在服务器端）
- ✅ 更简单（无需处理跨域问题）

**无需任何额外配置**，直接使用即可！

#### 生产环境（需要配置 CORS）

如果生产环境使用直接上传（客户端直接上传到 R2），则需要配置 CORS：

1. 在 R2 页面，选择您创建的存储桶
2. 点击 **Settings** 标签
3. 找到 **CORS Policy** 部分
4. 点击 **Edit CORS Policy**
5. 粘贴以下配置（替换为您的生产域名）：

```json
[
  {
    "AllowedOrigins": [
      "https://your-production-domain.com",
      "https://www.your-production-domain.com"
    ],
    "AllowedMethods": ["PUT", "GET", "HEAD", "DELETE"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag", "Content-Length"],
    "MaxAgeSeconds": 3600
  }
]
```

6. 点击 **Save**

**注意**：
- 本地开发：使用代理，无需 CORS
- 生产环境：如果使用直接上传，需要配置 CORS
- 生产环境也可以继续使用代理（设置 `NEXT_PUBLIC_USE_UPLOAD_PROXY=true`），这样也不需要 CORS

### 5. 配置自定义域名（可选，但推荐）

为了能够通过公共 URL 访问照片，您需要配置自定义域名：

1. 在存储桶的 **Settings** 页面
2. 找到 **Public Access** 部分
3. 点击 **Connect Domain** 或 **Add Custom Domain**
4. 输入您的域名（例如：`cdn.yourdomain.com`）
5. 按照提示配置 DNS 记录
6. 等待 DNS 生效（通常几分钟）

**如果没有自定义域名**：
- 可以使用 Cloudflare 提供的临时 URL（格式：`https://pub-xxxxx.r2.dev`）
- 或者暂时跳过此步骤，但照片将无法通过公共 URL 访问

### 6. 获取存储桶信息

在存储桶的 **Settings** 页面，找到以下信息：

- **Bucket Name**: 您创建的存储桶名称
- **Endpoint**: 格式类似 `https://xxxxx.r2.cloudflarestorage.com`
  - 可以在 API Token 页面找到，或使用格式：`https://<account-id>.r2.cloudflarestorage.com`
  - Account ID 可以在 Cloudflare Dashboard 的右侧栏找到

### 7. 配置环境变量

在项目根目录的 `.env.local` 文件中添加以下配置：

```env
# 存储提供商
STORAGE_PROVIDER=cloudflare-r2

# Cloudflare R2 配置
CLOUDFLARE_R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
CLOUDFLARE_R2_BUCKET=your-bucket-name
CLOUDFLARE_R2_REGION=auto
CLOUDFLARE_R2_ACCESS_KEY_ID=your-access-key-id
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your-secret-access-key
CLOUDFLARE_R2_PREFIX=camlife
CLOUDFLARE_R2_PUBLIC_URL=https://your-custom-domain.com
```

**配置说明**：

- `CLOUDFLARE_R2_ENDPOINT`: 替换 `your-account-id` 为您的 Cloudflare Account ID
- `CLOUDFLARE_R2_BUCKET`: 替换为您的存储桶名称
- `CLOUDFLARE_R2_ACCESS_KEY_ID`: 粘贴步骤 3 中保存的 Access Key ID
- `CLOUDFLARE_R2_SECRET_ACCESS_KEY`: 粘贴步骤 3 中保存的 Secret Access Key
- `CLOUDFLARE_R2_PREFIX`: 可选，用于组织文件（例如：`camlife` 会在所有文件前添加 `camlife/` 前缀）
- `CLOUDFLARE_R2_PUBLIC_URL`: **必需**，用于预览图片
  - 如果配置了自定义域名，使用您的域名
  - 如果没有，可以使用 Cloudflare 提供的临时 URL（格式：`https://pub-xxxxx.r2.dev`）
  - **重要**：必须先在存储桶设置中启用公开访问（见步骤 5）

### 5. 配置公开访问（必需，用于预览图片）

**重要**：如果不配置公开访问，上传的图片将无法在浏览器中预览！

#### 选项 A：使用 R2.dev 子域名（推荐，最简单）

1. 在 R2 页面，选择您创建的存储桶
2. 点击 **Settings** 标签
3. 找到 **Public Access** 部分
4. 点击 **Allow Access** 按钮
5. 选择 **R2.dev subdomain**
6. 复制生成的公共 URL（格式：`https://pub-xxxxx.r2.dev`）
7. 在 `.env.local` 中设置：
   ```env
   CLOUDFLARE_R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
   ```

#### 选项 B：使用自定义域名（生产环境推荐）

1. 在 R2 页面，选择您创建的存储桶
2. 点击 **Settings** 标签
3. 找到 **Public Access** 部分
4. 点击 **Allow Access** 按钮
5. 选择 **Connect Custom Domain**
6. 选择您的 Cloudflare 域名
7. 在 `.env.local` 中设置：
   ```env
   CLOUDFLARE_R2_PUBLIC_URL=https://your-custom-domain.com
   ```

**注意**：
- 公开访问 URL 必须正确配置，否则图片无法预览
- 如果使用 R2.dev 子域名，URL 格式为：`https://pub-<随机字符串>.r2.dev`
- 确保 `.env.local` 中的 `CLOUDFLARE_R2_PUBLIC_URL` 与存储桶设置中的公共 URL 完全一致
- 可以在浏览器中直接访问公共 URL 测试（例如：`https://pub-xxxxx.r2.dev/your-file.jpg`）

### 6. 验证配置

#### 方法一：使用 CORS 测试工具（推荐）

1. 在浏览器中打开 `scripts/test-cors.html` 文件
2. 从应用控制台复制预签名 URL（上传照片时会在控制台显示）
3. 将 URL 粘贴到测试工具中
4. 点击"测试 CORS"按钮
5. 如果测试失败，点击"生成 CORS 配置"获取正确的配置

#### 方法二：直接测试上传

1. 重启开发服务器：
   ```bash
   docker-compose -f docker-compose-dev.yml restart web
   ```

2. 尝试上传一张照片

3. 查看浏览器控制台：
   - 现在会显示更详细的错误信息
   - 包括当前 Origin、上传域名等
   - 如果 CORS 配置错误，会显示推荐的 CORS 配置 JSON

4. 如果仍然遇到错误，检查：
   - 浏览器控制台的错误信息（现在包含更多调试信息）
   - 服务器日志（会显示预签名 URL 的域名）
   - CORS 配置是否正确（确保包含当前 Origin）
   - 环境变量是否正确设置

## 常见问题

### Q: 本地开发需要配置 CORS 吗？

A: **不需要！** 本地开发时，应用默认使用服务器端代理上传，完全绕过 CORS 限制。只有在生产环境使用直接上传时才需要配置 CORS。

### Q: Status 0 错误是什么？

A: 如果您在本地开发时遇到 Status 0 错误，可能是因为：
1. 强制禁用了代理模式（`NEXT_PUBLIC_USE_UPLOAD_PROXY=false`）
2. 尝试使用直接上传但没有配置 CORS

**解决方案**：确保在 `.env.local` 中不要设置 `NEXT_PUBLIC_USE_UPLOAD_PROXY=false`，让应用使用默认的代理模式。

### Q: 生产环境如何选择上传方式？

A: 
- **使用代理**（推荐）：设置 `NEXT_PUBLIC_USE_UPLOAD_PROXY=true`，无需配置 CORS，更安全
- **直接上传**：设置 `NEXT_PUBLIC_USE_UPLOAD_PROXY=false`，需要配置 CORS，但可以减少服务器负载

### Q: 如何找到我的 Account ID？

A: 
1. 登录 Cloudflare Dashboard
2. 在右侧栏可以看到 Account ID
3. 或者在 R2 API Token 页面可以看到

### Q: 没有自定义域名怎么办？

A: 
1. 可以使用 Cloudflare 提供的临时公共 URL
2. 在存储桶设置中找到 **Public Access** → **R2.dev subdomain**
3. 启用后会得到一个类似 `https://pub-xxxxx.r2.dev` 的 URL
4. 将此 URL 设置为 `CLOUDFLARE_R2_PUBLIC_URL`

### Q: 上传的文件在哪里？

A: 
- 文件存储在您创建的 R2 存储桶中
- 可以通过 Cloudflare Dashboard → R2 → 您的存储桶查看
- 如果配置了公共访问，可以通过 `CLOUDFLARE_R2_PUBLIC_URL` 访问

### Q: 如何测试配置是否正确？

A: 可以使用 AWS CLI 测试（R2 兼容 S3 API）：

```bash
# 安装 AWS CLI
# macOS: brew install awscli

# 配置凭证
aws configure --profile r2
# AWS Access Key ID: 您的 CLOUDFLARE_R2_ACCESS_KEY_ID
# AWS Secret Access Key: 您的 CLOUDFLARE_R2_SECRET_ACCESS_KEY
# Default region: auto
# Default output format: json

# 测试连接
aws s3 ls s3://your-bucket-name --endpoint-url https://your-account-id.r2.cloudflarestorage.com --profile r2
```

## 安全提示

1. **永远不要提交 `.env.local` 到 Git**
2. 定期轮换 API Token
3. 使用最小权限原则（只授予必要的权限）
4. 在生产环境中使用环境变量管理服务（如 Vercel、Railway 等）

## 下一步

配置完成后：
1. 重启开发服务器
2. 尝试上传照片
3. 如果遇到问题，查看浏览器控制台和服务器日志

祝您使用愉快！🎉

