"""
图书管理系统 - Flask 后端 API
数据库课程项目
"""

import os
import logging
from datetime import datetime
from flask import Flask, jsonify, request
from flask_cors import CORS
import psycopg2
from psycopg2 import pool

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 创建 Flask 应用
app = Flask(__name__)
CORS(app)  # 允许跨域请求

# 数据库连接池
db_pool = None

def init_db_pool():
    """初始化数据库连接池"""
    global db_pool
    try:
        db_pool = psycopg2.pool.SimpleConnectionPool(
            1, 20,  # 最小1个，最大20个连接
            host=os.getenv('DB_HOST', 'postgres'),
            database=os.getenv('DB_NAME', 'library'),
            user=os.getenv('DB_USER', 'admin'),
            password=os.getenv('DB_PASSWORD', 'admin123'),
            port=os.getenv('DB_PORT', '5432')
        )
        logger.info("数据库连接池初始化成功")
    except Exception as e:
        logger.error(f"数据库连接池初始化失败: {e}")

def get_db_connection():
    """从连接池获取数据库连接"""
    if db_pool:
        return db_pool.getconn()
    else:
        # 备用连接方式
        return psycopg2.connect(
            host=os.getenv('DB_HOST', 'postgres'),
            database=os.getenv('DB_NAME', 'library'),
            user=os.getenv('DB_USER', 'admin'),
            password=os.getenv('DB_PASSWORD', 'admin123'),
            port=os.getenv('DB_PORT', '5432')
        )

def release_db_connection(conn):
    """释放连接回连接池"""
    if db_pool and conn:
        db_pool.putconn(conn)

@app.route('/')
def index():
    """API 首页"""
    return jsonify({
        "service": "图书管理系统 API",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat(),
        "status": "running",
        "endpoints": {
            "健康检查": "/api/health",
            "获取所有图书": "/api/books (GET)",
            "添加图书": "/api/books (POST)",
            "获取图书详情": "/api/books/<id> (GET)",
            "更新图书": "/api/books/<id> (PUT)",
            "删除图书": "/api/books/<id> (DELETE)",
            "获取统计信息": "/api/stats",
            "初始化数据库": "/api/init (POST)"
        },
        "documentation": "详见 /api/docs"
    })

@app.route('/api/health', methods=['GET'])
def health_check():
    """健康检查接口"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        cursor.fetchone()
        cursor.close()
        release_db_connection(conn)
        
        return jsonify({
            "status": "healthy",
            "database": "connected",
            "timestamp": datetime.now().isoformat(),
            "service": "图书管理系统后端"
        })
    except Exception as e:
        logger.error(f"健康检查失败: {e}")
        return jsonify({
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500

@app.route('/api/books', methods=['GET'])
def get_books():
    """获取所有图书"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 获取查询参数
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 10))
        offset = (page - 1) * per_page
        
        # 查询图书
        cursor.execute("""
            SELECT id, isbn, title, author, publisher, 
                   publish_date, price, description
            FROM books 
            ORDER BY created_at DESC
            LIMIT %s OFFSET %s
        """, (per_page, offset))
        
        books = cursor.fetchall()
        
        # 获取总数
        cursor.execute("SELECT COUNT(*) FROM books")
        total = cursor.fetchone()[0]
        
        cursor.close()
        release_db_connection(conn)
        
        # 格式化返回数据
        result = []
        for book in books:
            result.append({
                "id": book[0],
                "isbn": book[1],
                "title": book[2],
                "author": book[3],
                "publisher": book[4],
                "publish_date": str(book[5]) if book[5] else None,
                "price": float(book[6]) if book[6] else 0,
                "description": book[7]
            })
        
        return jsonify({
            "success": True,
            "data": result,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": total,
                "total_pages": (total + per_page - 1) // per_page
            },
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"获取图书失败: {e}")
        return jsonify({
            "success": False,
            "error": str(e),
            "message": "获取图书列表失败"
        }), 500

@app.route('/api/books/<int:book_id>', methods=['GET'])
def get_book(book_id):
    """获取图书详情"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, isbn, title, author, publisher, 
                   publish_date, price, description,
                   created_at, updated_at
            FROM books 
            WHERE id = %s
        """, (book_id,))
        
        book = cursor.fetchone()
        cursor.close()
        release_db_connection(conn)
        
        if not book:
            return jsonify({
                "success": False,
                "message": "图书不存在"
            }), 404
        
        return jsonify({
            "success": True,
            "data": {
                "id": book[0],
                "isbn": book[1],
                "title": book[2],
                "author": book[3],
                "publisher": book[4],
                "publish_date": str(book[5]) if book[5] else None,
                "price": float(book[6]) if book[6] else 0,
                "description": book[7],
                "created_at": str(book[8]),
                "updated_at": str(book[9])
            },
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"获取图书详情失败: {e}")
        return jsonify({
            "success": False,
            "error": str(e),
            "message": "获取图书详情失败"
        }), 500

@app.route('/api/books', methods=['POST'])
def create_book():
    """创建新图书"""
    try:
        data = request.json
        if not data:
            return jsonify({
                "success": False,
                "message": "请求数据不能为空"
            }), 400
        
        # 验证必要字段
        required_fields = ['isbn', 'title', 'author']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({
                    "success": False,
                    "message": f"缺少必要字段: {field}"
                }), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 插入新图书
        cursor.execute("""
            INSERT INTO books (isbn, title, author, publisher, 
                              publish_date, price, description)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            data['isbn'],
            data['title'],
            data['author'],
            data.get('publisher'),
            data.get('publish_date'),
            data.get('price'),
            data.get('description')
        ))
        
        book_id = cursor.fetchone()[0]
        conn.commit()
        
        cursor.close()
        release_db_connection(conn)
        
        return jsonify({
            "success": True,
            "message": "图书创建成功",
            "data": {"id": book_id},
            "timestamp": datetime.now().isoformat()
        }), 201
        
    except psycopg2.IntegrityError as e:
        return jsonify({
            "success": False,
            "error": "数据完整性错误",
            "message": "ISBN可能已存在"
        }), 400
    except Exception as e:
        logger.error(f"创建图书失败: {e}")
        return jsonify({
            "success": False,
            "error": str(e),
            "message": "创建图书失败"
        }), 500

@app.route('/api/books/<int:book_id>', methods=['PUT'])
def update_book(book_id):
    """更新图书信息"""
    try:
        data = request.json
        if not data:
            return jsonify({
                "success": False,
                "message": "请求数据不能为空"
            }), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 构建更新语句
        update_fields = []
        values = []
        
        for field in ['title', 'author', 'publisher', 'publish_date', 'price', 'description']:
            if field in data:
                update_fields.append(f"{field} = %s")
                values.append(data[field])
        
        if not update_fields:
            return jsonify({
                "success": False,
                "message": "没有可更新的字段"
            }), 400
        
        values.append(book_id)
        
        cursor.execute(f"""
            UPDATE books 
            SET {', '.join(update_fields)}, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
            RETURNING id
        """, values)
        
        updated = cursor.fetchone()
        conn.commit()
        
        cursor.close()
        release_db_connection(conn)
        
        if not updated:
            return jsonify({
                "success": False,
                "message": "图书不存在"
            }), 404
        
        return jsonify({
            "success": True,
            "message": "图书更新成功",
            "data": {"id": book_id},
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"更新图书失败: {e}")
        return jsonify({
            "success": False,
            "error": str(e),
            "message": "更新图书失败"
        }), 500

@app.route('/api/books/<int:book_id>', methods=['DELETE'])
def delete_book(book_id):
    """删除图书"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("DELETE FROM books WHERE id = %s RETURNING id", (book_id,))
        deleted = cursor.fetchone()
        conn.commit()
        
        cursor.close()
        release_db_connection(conn)
        
        if not deleted:
            return jsonify({
                "success": False,
                "message": "图书不存在"
            }), 404
        
        return jsonify({
            "success": True,
            "message": "图书删除成功",
            "data": {"id": book_id},
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"删除图书失败: {e}")
        return jsonify({
            "success": False,
            "error": str(e),
            "message": "删除图书失败"
        }), 500

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """获取系统统计信息"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 获取图书统计
        cursor.execute("SELECT COUNT(*) FROM books")
        total_books = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(DISTINCT author) FROM books")
        total_authors = cursor.fetchone()[0]
        
        cursor.execute("SELECT AVG(price) FROM books WHERE price > 0")
        avg_price = cursor.fetchone()[0] or 0
        
        cursor.execute("""
            SELECT title, author, price 
            FROM books 
            WHERE price > 0 
            ORDER BY price DESC 
            LIMIT 1
        """)
        most_expensive = cursor.fetchone()
        
        cursor.close()
        release_db_connection(conn)
        
        return jsonify({
            "success": True,
            "data": {
                "total_books": total_books,
                "total_authors": total_authors,
                "average_price": round(float(avg_price), 2),
                "most_expensive_book": {
                    "title": most_expensive[0] if most_expensive else None,
                    "author": most_expensive[1] if most_expensive else None,
                    "price": float(most_expensive[2]) if most_expensive and most_expensive[2] else 0
                }
            },
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"获取统计信息失败: {e}")
        return jsonify({
            "success": False,
            "error": str(e),
            "message": "获取统计信息失败"
        }), 500

@app.route('/api/init', methods=['POST'])
def init_database():
    """初始化数据库（用于演示）"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 添加更多示例数据
        sample_books = [
            ('9787115470669', 'Flask Web开发实战', '李辉', '人民邮电出版社', 79.00),
            ('9787111554905', 'Docker技术入门与实战', '杨保华', '机械工业出版社', 89.00),
            ('9787121411152', '云计算架构', '王利', '电子工业出版社', 69.00),
            ('9787302513015', '人工智能导论', '李航', '清华大学出版社', 75.00),
            ('9787111641247', 'Spring Boot实战', '王福强', '机械工业出版社', 99.00)
        ]
        
        inserted_count = 0
        for isbn, title, author, publisher, price in sample_books:
            try:
                cursor.execute("""
                    INSERT INTO books (isbn, title, author, publisher, price)
                    VALUES (%s, %s, %s, %s, %s)
                    ON CONFLICT (isbn) DO NOTHING
                """, (isbn, title, author, publisher, price))
                if cursor.rowcount > 0:
                    inserted_count += 1
            except:
                continue
        
        conn.commit()
        cursor.close()
        release_db_connection(conn)
        
        return jsonify({
            "success": True,
            "message": f"数据库初始化完成，添加了 {inserted_count} 本新图书",
            "data": {"books_added": inserted_count},
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"初始化数据库失败: {e}")
        return jsonify({
            "success": False,
            "error": str(e),
            "message": "初始化数据库失败"
        }), 500

@app.route('/api/docs', methods=['GET'])
def api_documentation():
    """API 文档"""
    return jsonify({
        "documentation": {
            "项目名称": "图书管理系统 API",
            "版本": "1.0.0",
            "数据库": "PostgreSQL",
            "框架": "Flask",
            "部署方式": "Docker + 本地运行",
            "在线演示": "GitHub + Vercel",
            "接口说明": {
                "GET /api/health": "健康检查，验证服务状态",
                "GET /api/books": "获取图书列表，支持分页",
                "GET /api/books/<id>": "获取特定图书详情",
                "POST /api/books": "创建新图书",
                "PUT /api/books/<id>": "更新图书信息",
                "DELETE /api/books/<id>": "删除图书",
                "GET /api/stats": "获取系统统计信息",
                "POST /api/init": "初始化数据库（演示用）"
            },
            "请求示例": {
                "创建图书": {
                    "method": "POST",
                    "url": "/api/books",
                    "body": {
                        "isbn": "9787115428028",
                        "title": "Python编程从入门到实践",
                        "author": "Eric Matthes",
                        "publisher": "人民邮电出版社",
                        "price": 89.00
                    }
                }
            }
        }
    })

# 应用启动时初始化数据库连接池
@app.before_first_request
def initialize():
    init_db_pool()
    logger.info("应用初始化完成")

if __name__ == '__main__':
    # 启动 Flask 应用
    port = int(os.getenv('PORT', 8080))
    logger.info(f"启动图书管理系统 API，端口: {port}")
    logger.info(f"健康检查: http://localhost:{port}/api/health")
    logger.info(f"API 文档: http://localhost:{port}/api/docs")
    
    app.run(host='0.0.0.0', port=port, debug=False)