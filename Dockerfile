# 基于轻量级 Node 镜像
FROM node:18-alpine

# 安装 pnpm 8.x（或最新）
RUN npm install -g pnpm@8

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制项目文件
COPY . .

# 暴露端口（如有需要，可移除）
# EXPOSE 3000

# 启动命令
CMD ["node", "t_input_with_t_output.js"] 