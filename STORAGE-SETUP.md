# 存储服务配置指南

本指南将帮助您配置对象存储服务，用于存储上传的照片。

## 支持的存储服务

| 存储服务 | 推荐指数 | 特点 |
|---------|---------|------|
| **Cloudflare R2** | ⭐⭐⭐⭐⭐ | 免费额度高（10GB存储+每月100万次读取），S3 兼容，全球 CDN |
| **腾讯云 COS** | ⭐⭐⭐⭐ | 国内访问快，S3 兼容，价格合理 |
| **AWS S3** | ⭐⭐⭐ | 稳定可靠，生态完善，适合企业级应用 |
| **Vercel Blob** | ⭐⭐⭐ | 与 Vercel 集成方便，适合小型项目 |

---

## 📋 目录

- [Cloudflare R2 配置](#cloudflare-r2-配置)
- [腾讯云 COS 配置](#腾讯云-cos-配置)
- [安全最佳实践](#安全最佳实践)
- [CORS 配置指南](#cors-配置指南)
- [常见问题](#常见问题)

---

## Cloudflare R2 配置

### 1. 创建 Cloudflare 账户

1. 访问 [Cloudflare](https://dash.cloudflare.com/sign-up)
2. 注册或登录账户

### 2. 创建 R2 存储桶

1. 登录 Cloudflare Dashboard
2. 在左侧菜单选择 **R2**
3. 点击 **Create bucket**
4. 输入存储桶名称（例如：`camlife-photos`）
5. 选择位置（建议选择离您最近的区域）
6. 点击 **Create bucket**

### 3. 创建 API Token

1. 在 R2 页面，点击右上角的 **Manage R2 API Tokens**
2. 点击 **Create API token**
3. 配置：
   - **Token name**: `camlife-prod`
   - **Permissions**: **Object Read & Write**
   - **Specify bucket(s)**: 选择特定存储桶（更安全）
   - **TTL**: 建议设置过期时间（如 1 年）
4. 点击 **Create API Token**
5. **重要**：复制并安全保存 **Access Key ID** 和 **Secret Access Key**

### 4. 配置公开访问

1. 选择存储桶 → **Settings**
2. 找到 **Public Access**
3. 点击 **Allow Access**
4. 选择方式：
   - **R2.dev subdomain**（快速，格式：`https://pub-xxxxx.r2.dev`）
   - **Connect Custom Domain**（推荐生产环境，需要自有域名）

### 5. 环境变量配置

```bash
STORAGE_PROVIDER=cloudflare-r2
CLOUDFLARE_R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
CLOUDFLARE_R2_BUCKET=your-bucket-name
CLOUDFLARE_R2_REGION=auto
CLOUDFLARE_R2_ACCESS_KEY_ID=your-access-key-id
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your-secret-access-key
CLOUDFLARE_R2_PREFIX=camlife
CLOUDFLARE_R2_PUBLIC_URL=https://your-public-url.com
```

---

## 腾讯云 COS 配置

### 1. 创建腾讯云账户

1. 访问 [腾讯云](https://cloud.tencent.com/)
2. 注册或登录账户
3. 完成实名认证

### 2. 创建 COS 存储桶

1. 进入 [对象存储控制台](https://console.cloud.tencent.com/cos)
2. 点击 **存储桶列表** → **创建存储桶**
3. 配置：
   - **名称**: `camlife`（系统会自动添加 APPID 后缀）
   - **所属地域**: 选择离用户最近的地域（如 `ap-shanghai`）
   - **访问权限**: 选择 **公有读私有写**（用于图片预览）
4. 点击 **创建**

### 3. 获取 API 密钥

1. 进入 [访问管理 → API密钥管理](https://console.cloud.tencent.com/cam/capi)
2. 点击 **新建密钥**
3. 复制并安全保存 **SecretId** 和 **SecretKey**

> ⚠️ **安全建议**：生产环境建议使用子账号密钥，并限制权限范围

### 4. 配置公开访问

COS 支持多种公开访问方式：

#### 方式 A：默认域名

存储桶创建后自动获得默认域名：
```
https://<bucket-name>-<appid>.cos.<region>.myqcloud.com
```

例如：
```
https://camlife-1234567890.cos.ap-shanghai.myqcloud.com
```

#### 方式 B：CDN 加速域名（推荐生产环境）

1. 在存储桶设置中，找到 **域名与传输管理** → **默认 CDN 加速域名**
2. 开启 CDN 加速
3. 使用生成的 CDN 域名

#### 方式 C：自定义域名

1. 在存储桶设置中，找到 **域名与传输管理** → **自定义加速域名**
2. 添加您的域名并配置 CNAME 解析

### 5. 环境变量配置

```bash
STORAGE_PROVIDER=tencent-cos
TENCENT_COS_SECRET_ID=your-secret-id
TENCENT_COS_SECRET_KEY=your-secret-key
TENCENT_COS_BUCKET=camlife-1234567890
TENCENT_COS_REGION=ap-shanghai
TENCENT_COS_PREFIX=camlife
TENCENT_COS_PUBLIC_URL=https://camlife-1234567890.cos.ap-shanghai.myqcloud.com
```

### 腾讯云 COS 地域列表

| 地域 | 代码 |
|------|------|
| 北京 | ap-beijing |
| 上海 | ap-shanghai |
| 广州 | ap-guangzhou |
| 成都 | ap-chengdu |
| 重庆 | ap-chongqing |
| 南京 | ap-nanjing |
| 香港 | ap-hongkong |
| 新加坡 | ap-singapore |
| 东京 | ap-tokyo |
| 首尔 | ap-seoul |

完整列表：[地域和访问域名](https://cloud.tencent.com/document/product/436/6224)

---

## 安全最佳实践

### 🔐 密钥安全

1. **永远不要将密钥提交到 Git**
   ```bash
   # 确保 .gitignore 包含
   .env
   .env.local
   ```

2. **使用最小权限原则**
   - Cloudflare R2：限制 Token 只能访问特定存储桶
   - 腾讯云 COS：使用子账号，授予最小必要权限

3. **定期轮换密钥**
   - 建议每 6-12 个月更换一次密钥
   - 更换前先创建新密钥，测试后再删除旧密钥

4. **使用环境变量管理服务**
   - Vercel / Railway / Render 等平台的环境变量功能
   - Kubernetes Secrets
   - HashiCorp Vault

### 🌐 CORS 安全配置

**重要**：错误的 CORS 配置可能导致安全风险！

#### 推荐：使用服务器端代理（最安全）

CamLife 默认使用服务器端代理上传，**完全绕过 CORS 限制**：

- ✅ 无需配置 CORS
- ✅ 密钥仅在服务器端使用
- ✅ 防止跨站请求伪造

```bash
# 强制使用代理（默认行为，无需设置）
NEXT_PUBLIC_USE_UPLOAD_PROXY=true
```

#### 生产环境直接上传（需要严格配置 CORS）

如果选择直接上传以减少服务器负载，**必须严格配置 CORS**：

##### Cloudflare R2 CORS 配置

```json
[
  {
    "AllowedOrigins": [
      "https://your-production-domain.com"
    ],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["Content-Type", "Content-Length"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

##### 腾讯云 COS CORS 配置

1. 进入存储桶 → **安全管理** → **跨域访问 CORS 设置**
2. 添加规则：

| 配置项 | 值 |
|--------|-----|
| 来源 Origin | `https://your-production-domain.com` |
| 操作 Methods | `PUT, GET, HEAD` |
| Allow-Headers | `Content-Type, Content-Length` |
| Expose-Headers | `ETag` |
| 超时 Max-Age | `3600` |

> ⚠️ **安全警告**：
> - **不要使用 `*` 作为 AllowedOrigins**
> - 只允许必要的 HTTP 方法
> - 限制允许的 Headers

### 🔒 存储桶安全

#### Cloudflare R2

1. **访问控制**
   - 生产环境：使用 **公有读私有写**
   - 私有数据：使用 **私有** 并通过预签名 URL 访问

2. **防盗链**
   - 配置 Referer 白名单（在 WAF 规则中设置）

#### 腾讯云 COS

1. **访问权限**
   - 图片展示：**公有读私有写**
   - 私有数据：**私有读写** + 预签名 URL

2. **防盗链配置**
   - 进入存储桶 → **安全管理** → **防盗链设置**
   - 开启防盗链，添加允许的 Referer 域名

3. **跨域资源共享配置**
   - 只允许必要的域名
   - 定期审查 CORS 规则

4. **日志监控**
   - 开启访问日志
   - 配置异常访问告警

### 📊 监控与审计

1. **开启访问日志**
   - Cloudflare R2：在存储桶设置中启用日志
   - 腾讯云 COS：开启访问日志并存储到指定存储桶

2. **设置告警**
   - 异常流量告警
   - 费用超限告警
   - API 调用失败告警

3. **定期审计**
   - 检查存储桶权限设置
   - 审查 API 访问日志
   - 验证 CORS 配置

---

## CORS 配置指南

### 什么时候需要配置 CORS？

| 场景 | 需要配置 CORS |
|------|--------------|
| 本地开发（使用代理） | ❌ 不需要 |
| 生产环境（使用代理） | ❌ 不需要 |
| 生产环境（直接上传） | ✅ 需要 |

### 测试 CORS 配置

使用浏览器开发者工具检查：

1. 打开 Network 面板
2. 尝试上传文件
3. 检查请求是否有 CORS 错误
4. 查看响应头中的 `Access-Control-Allow-*` 头

### 常见 CORS 错误

#### 错误 1: No 'Access-Control-Allow-Origin' header

**原因**：CORS 策略未配置或 Origin 不在白名单

**解决**：添加正确的 Origin 到 AllowedOrigins

#### 错误 2: Method not allowed

**原因**：AllowedMethods 中缺少请求方法

**解决**：添加 `PUT` 到 AllowedMethods

#### 错误 3: Header not allowed

**原因**：请求头不在 AllowedHeaders 中

**解决**：添加 `Content-Type` 到 AllowedHeaders

---

## 常见问题

### Q: 本地开发需要配置 CORS 吗？

**A**: 不需要！本地开发时，应用默认使用服务器端代理上传，完全绕过 CORS 限制。

### Q: 如何切换存储提供商？

**A**: 修改 `.env` 文件中的 `STORAGE_PROVIDER` 并配置相应的环境变量即可。

### Q: 图片无法预览怎么办？

**A**: 检查以下配置：
1. 确保存储桶已开启公开访问
2. 确保 `*_PUBLIC_URL` 配置正确
3. 检查防盗链设置是否阻止了访问

### Q: 如何找到 Cloudflare Account ID？

**A**: 
1. 登录 Cloudflare Dashboard
2. 在右侧栏可以看到 Account ID
3. 或在 R2 API Token 页面查看

### Q: 腾讯云 COS 的 APPID 在哪里？

**A**: 
1. 登录腾讯云控制台
2. 进入 [账号信息](https://console.cloud.tencent.com/developer)
3. 找到 APPID 字段

### Q: 上传的文件在哪里查看？

**A**: 
- **Cloudflare R2**：Dashboard → R2 → 存储桶 → Objects
- **腾讯云 COS**：控制台 → 存储桶 → 文件列表

### Q: 如何测试存储配置是否正确？

**A**: 使用 AWS CLI 测试（R2 和 COS 都兼容 S3 API）：

```bash
# 测试 Cloudflare R2
aws s3 ls s3://your-bucket \
  --endpoint-url https://your-account-id.r2.cloudflarestorage.com \
  --profile r2

# 测试腾讯云 COS
aws s3 ls s3://your-bucket-appid \
  --endpoint-url https://cos.ap-shanghai.myqcloud.com \
  --profile cos
```

---

## 下一步

配置完成后：

1. 重启应用服务
2. 尝试上传照片
3. 检查照片是否可以正常预览
4. 如遇问题，查看浏览器控制台和服务器日志

祝您使用愉快！🎉
