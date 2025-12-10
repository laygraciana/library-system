-- 图书管理系统数据库初始化脚本
if (Test-Path "docker/database/init.sql") {
    $content = Get-Content "docker/database/init.sql" -Raw
    if (-not $content.Contains("CREATE TABLE")) {
        Write-Host "❌ init.sql 内容错误，正在修复..." -ForegroundColor Red
        @"
-- 图书管理系统数据库初始化
CREATE TABLE IF NOT EXISTS books (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    author VARCHAR(100) NOT NULL,
    isbn VARCHAR(20) UNIQUE NOT NULL,
    publisher VARCHAR(100),
    price DECIMAL(10, 2) DEFAULT 0.00
);

INSERT INTO books (title, author, isbn, publisher) VALUES
('Python编程', 'Eric Matthes', '9787115428028', '人民邮电出版社'),
('三体', '刘慈欣', '9787536692930', '重庆出版社');
"@ | Out-File -FilePath "docker/database/init.sql" -Encoding UTF8
        Write-Host "✅ init.sql 已修复" -ForegroundColor Green
    }
}

-- 创建图书表
CREATE TABLE IF NOT EXISTS books (
    id SERIAL PRIMARY KEY,
    isbn VARCHAR(20) UNIQUE NOT NULL,
    title VARCHAR(200) NOT NULL,
    author VARCHAR(100) NOT NULL,
    publisher VARCHAR(100),
    publish_date DATE,
    price DECIMAL(10, 2) DEFAULT 0.00,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建借阅记录表
CREATE TABLE IF NOT EXISTS borrow_records (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
    borrow_date DATE NOT NULL,
    due_date DATE NOT NULL,
    return_date DATE,
    status VARCHAR(20) DEFAULT 'borrowed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 插入示例图书数据
INSERT INTO books (isbn, title, author, publisher, price) VALUES
('9787115428028', 'Python编程从入门到实践', 'Eric Matthes', '人民邮电出版社', 89.00),
('9787111544937', '深入理解计算机系统', 'Randal E. Bryant', '机械工业出版社', 139.00),
('9787536692930', '三体', '刘慈欣', '重庆出版社', 48.00),
('9787301250058', '经济学原理', '曼昆', '北京大学出版社', 88.00),
('9787111554264', '数据库系统概念', 'Abraham Silberschatz', '机械工业出版社', 129.00);

-- 插入示例用户
INSERT INTO users (username, email, password_hash, role) VALUES
('admin', 'admin@library.com', '$2b$10$hashedpassword', 'admin'),
('user1', 'user1@library.com', '$2b$10$hashedpassword', 'user');

-- 创建索引优化查询性能
CREATE INDEX idx_books_title ON books(title);
CREATE INDEX idx_books_author ON books(author);
CREATE INDEX idx_books_isbn ON books(isbn);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_borrow_records_user_id ON borrow_records(user_id);
CREATE INDEX idx_borrow_records_book_id ON borrow_records(book_id);

-- 显示初始化信息
SELECT '✅ 数据库初始化完成！' as message;
SELECT '📚 图书表: ' || COUNT(*) || ' 条记录' as books_count FROM books;
SELECT '👤 用户表: ' || COUNT(*) || ' 条记录' as users_count FROM users;