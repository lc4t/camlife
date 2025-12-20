# MapTiler 配置指南

MapTiler 是一个提供高质量地图样式的服务，配置后可获得更好的地图显示效果（包括深色模式支持）。

## 为什么使用 MapTiler？

- ✅ **更好的地图样式**：提供多种专业地图样式（街道、卫星、地形等）
- ✅ **深色模式支持**：自动适配系统深色模式
- ✅ **免费额度充足**：每月 100,000 次地图加载（个人使用完全足够）
- ✅ **完全可选**：不配置也能正常使用（会使用默认的免费样式）

## 获取 MapTiler API Key

### 步骤 1: 注册账号

1. 访问 [MapTiler Cloud](https://cloud.maptiler.com/)
2. 点击 "Sign Up" 注册账号（可以使用 GitHub、Google 等账号快速注册）

### 步骤 2: 创建 API Key

1. 登录后，进入 [API Keys 页面](https://cloud.maptiler.com/account/keys/)
2. 点击 "Create a new key"
3. 填写 Key 名称（例如：`camlife-dev`）
4. 选择权限范围（建议选择 "All APIs"）
5. 点击 "Create" 创建 Key
6. 复制生成的 API Key（格式类似：`xxxxxxxxxxxxxxxxxx`）

### 步骤 3: 配置到项目

1. 打开项目根目录的 `.env.local` 文件（如果不存在，从 `env.local.example` 复制）
2. 添加以下配置：

```bash
NEXT_PUBLIC_MAPTILER_API_KEY=your_maptiler_api_key_here
```

3. 保存文件并重启开发服务器

## 可用的地图样式

配置 MapTiler Key 后，应用会自动使用以下样式：

- **浅色模式**：`streets-v2` - 详细的街道地图
- **深色模式**：`dark-v2` - 深色主题地图

### 其他可用样式

如果需要使用其他样式，可以修改 `src/components/mapbox/index.tsx` 和 `src/components/common/location-map.tsx` 中的样式名称：

- `openstreetmap` - OpenStreetMap 风格
- `basic` - 基础样式
- `streets-v2` - 街道地图（默认浅色）
- `outdoors-v2` - 户外/地形地图
- `satellite` - 卫星图像
- `dark-v2` - 深色主题（默认深色）
- `light-v2` - 浅色主题
- `winter-v2` - 冬季主题

示例：

```typescript
const styleName = resolvedTheme === 'dark' ? 'dark-v2' : 'satellite'
```

## 免费额度说明

MapTiler 免费套餐提供：
- **每月 100,000 次地图加载**
- **每月 100,000 次地理编码请求**
- 对于个人项目和小型应用完全足够

如果超出免费额度，可以：
1. 升级到付费套餐
2. 或者移除 API Key，使用默认的免费样式

## 验证配置

配置完成后：

1. 重启开发服务器：`bun run dev`
2. 打开地图页面，检查地图样式是否已更新
3. 切换系统深色/浅色模式，确认地图样式自动适配

## 故障排除

### 地图不显示

- 检查 API Key 是否正确配置
- 检查浏览器控制台是否有错误信息
- 确认 API Key 在 MapTiler 控制台中状态为 "Active"

### 样式未更新

- 清除浏览器缓存
- 确认 `.env.local` 文件已保存
- 重启开发服务器

### 超出免费额度

- 在 MapTiler 控制台查看使用情况
- 考虑升级到付费套餐
- 或移除 API Key 使用默认样式

## 相关链接

- [MapTiler 官网](https://www.maptiler.com/)
- [MapTiler Cloud 控制台](https://cloud.maptiler.com/)
- [MapTiler 样式文档](https://docs.maptiler.com/cloud/api/maps/)
- [MapLibre GL JS 文档](https://maplibre.org/maplibre-gl-js-docs/)

