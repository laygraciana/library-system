# 前端 Dockerfile
FROM nginx:alpine

# 复制前端文件到 Nginx
COPY ../frontend /usr/share/nginx/html

# 复制 Nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 暴露端口
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]