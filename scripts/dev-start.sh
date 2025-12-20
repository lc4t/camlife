#!/bin/bash

# 本地开发环境启动脚本

set -e

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 启动 CamLife 本地开发环境${NC}\n"

# 检查 .env.local 文件是否存在
if [ ! -f .env.local ]; then
    echo -e "${YELLOW}⚠️  未找到 .env.local 文件${NC}"
    echo -e "${YELLOW}正在从 env.local.example 创建...${NC}"
    if [ -f env.local.example ]; then
        cp env.local.example .env.local
        echo -e "${GREEN}✓ 已创建 .env.local，请编辑并填入必要的配置${NC}"
        echo -e "${YELLOW}至少需要配置存储服务（CLOUDFLARE_R2_* 或 AWS_S3_*）${NC}"
        echo -e "${YELLOW}注意：地图功能使用 MapLibre（免费开源），无需配置 API Token${NC}\n"
    else
        echo -e "${RED}✗ 未找到 env.local.example 文件${NC}"
        exit 1
    fi
fi

# 检查 Docker 是否运行
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}✗ Docker 未运行，请先启动 Docker${NC}"
    exit 1
fi

# 启动服务
echo -e "${GREEN}📦 启动 Docker 服务...${NC}\n"

# 检查是否需要运行迁移
if [ "$1" == "--migrate" ] || [ "$1" == "-m" ]; then
    echo -e "${YELLOW}🔄 运行数据库迁移...${NC}"
    docker-compose -f docker-compose-dev.yml --profile migration up migration
    echo -e "${GREEN}✓ 数据库迁移完成${NC}\n"
fi

# 启动所有服务
docker-compose -f docker-compose-dev.yml up -d

echo -e "\n${GREEN}✓ 服务已启动！${NC}\n"
echo -e "${GREEN}📝 服务信息：${NC}"
echo -e "  • Web 应用: ${GREEN}http://localhost:3000${NC}"
echo -e "  • PostgreSQL: ${GREEN}localhost:5432${NC}"
echo -e "    - 数据库: ${YELLOW}camlife_dev${NC}"
echo -e "    - 用户名: ${YELLOW}postgres${NC}"
echo -e "    - 密码: ${YELLOW}postgres_dev_password${NC}\n"

echo -e "${GREEN}📋 常用命令：${NC}"
echo -e "  • 查看日志: ${YELLOW}docker-compose -f docker-compose-dev.yml logs -f${NC}"
echo -e "  • 停止服务: ${YELLOW}docker-compose -f docker-compose-dev.yml down${NC}"
echo -e "  • 运行迁移: ${YELLOW}docker-compose -f docker-compose-dev.yml --profile migration up migration${NC}\n"

# 等待服务就绪
echo -e "${YELLOW}⏳ 等待服务就绪...${NC}"
sleep 3

# 检查服务状态
if docker-compose -f docker-compose-dev.yml ps | grep -q "Up"; then
    echo -e "${GREEN}✓ 所有服务运行正常${NC}\n"
else
    echo -e "${RED}⚠️  部分服务可能未正常启动，请检查日志${NC}\n"
    echo -e "运行以下命令查看日志："
    echo -e "  ${YELLOW}docker-compose -f docker-compose-dev.yml logs${NC}\n"
fi

