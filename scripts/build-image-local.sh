#!/bin/bash

# 本地构建和测试 Docker 镜像脚本
# 用于在推送到 GitHub 之前验证镜像构建

set -e

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

IMAGE_NAME="camlife-web"
IMAGE_TAG="local"
FULL_IMAGE_NAME="${IMAGE_NAME}:${IMAGE_TAG}"

echo -e "${BLUE}🔨 开始构建 Docker 镜像...${NC}\n"

# 检查 Dockerfile 是否存在
if [ ! -f "docker/web/Dockerfile" ]; then
    echo -e "${RED}✗ 未找到 docker/web/Dockerfile${NC}"
    exit 1
fi

# 构建镜像
echo -e "${YELLOW}📦 构建镜像: ${FULL_IMAGE_NAME}${NC}"
docker build \
    -f docker/web/Dockerfile \
    -t "${FULL_IMAGE_NAME}" \
    .

if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}✓ 镜像构建成功！${NC}\n"
    
    # 显示镜像信息
    echo -e "${BLUE}📊 镜像信息：${NC}"
    docker images "${FULL_IMAGE_NAME}" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
    
    echo -e "\n${BLUE}💡 下一步：${NC}"
    echo -e "  1. 测试运行镜像："
    echo -e "     ${YELLOW}docker run -p 3000:3000 -e DATABASE_URL='postgresql://...' -e SKIP_ENV_VALIDATION=true ${FULL_IMAGE_NAME}${NC}"
    echo -e "\n  2. 推送到 GitHub Container Registry："
    echo -e "     ${YELLOW}docker tag ${FULL_IMAGE_NAME} ghcr.io/lc4t/camlife-dev:latest${NC}"
    echo -e "     ${YELLOW}docker push ghcr.io/lc4t/camlife-dev:latest${NC}"
    echo -e "\n  3. 或等待 GitHub Actions 自动构建（推送到 main 分支后）"
else
    echo -e "\n${RED}✗ 镜像构建失败${NC}"
    exit 1
fi

