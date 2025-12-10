# 图书管理系统 - API 接口文档

## 概述
基于 Flask 的 RESTful API，提供完整的图书管理功能。

**Base URL**: `http://localhost:8080` (本地) 或 `https://library-backend.onrender.com` (云部署)

## 接口列表

### 1. 健康检查
**GET** `/api/health`

检查服务状态和数据库连接。

**响应示例**:
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2024-12-11T10:30:00Z",
  "service": "图书管理系统后端"
}