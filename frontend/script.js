/**
 * 图书管理系统 - 前端逻辑
 * 数据库课程项目
 */

// API 配置
const API_CONFIG = {
    // 如果是本地开发
    // BASE_URL: 'http://localhost:5000',
    
    // 如果是 Vercel 部署，连接到 PythonAnywhere
    BASE_URL: 'https://Graci.pythonanywhere.com',
    
    ENDPOINTS: {
        HEALTH: '/api/health',
        BOOKS: '/api/books',
        STATS: '/api/stats',
        INIT: '/api/init'
    }
};

// 全局状态
let currentBooks = [];
let currentPage = 1;
const ITEMS_PER_PAGE = 10;

// DOM 元素
const elements = {
    // 状态显示
    healthStatus: document.getElementById('health-status'),
    bookCount: document.getElementById('book-count'),
    
    // 按钮
    refreshBtn: document.getElementById('refresh-btn'),
    addBookBtn: document.getElementById('add-book-btn'),
    initDbBtn: document.getElementById('init-db-btn'),
    
    // 表格
    booksTable: document.getElementById('books-table'),
    booksBody: document.getElementById('books-body'),
    
    // 表单
    bookForm: document.getElementById('book-form'),
    modal: document.getElementById('book-modal'),
    
    // 分页
    pagination: document.getElementById('pagination'),
    prevPageBtn: document.getElementById('prev-page'),
    nextPageBtn: document.getElementById('next-page'),
    pageInfo: document.getElementById('page-info'),
    
    // 加载状态
    loadingIndicator: document.getElementById('loading-indicator')
};

// 初始化应用
document.addEventListener('DOMContentLoaded', function() {
    console.log('📚 图书管理系统前端初始化 - script.js:58');
    
    // 绑定事件
    bindEvents();
    
    // 初始加载
    checkHealth();
    loadBooks();
    loadStats();
});

/**
 * 绑定事件监听器
 */
function bindEvents() {
    // 刷新按钮
    if (elements.refreshBtn) {
        elements.refreshBtn.addEventListener('click', function() {
            showNotification('正在刷新数据...', 'info');
            loadBooks();
            loadStats();
        });
    }
    
    // 添加图书按钮
    if (elements.addBookBtn) {
        elements.addBookBtn.addEventListener('click', showAddBookForm);
    }
    
    // 初始化数据库按钮
    if (elements.initDbBtn) {
        elements.initDbBtn.addEventListener('click', initDatabase);
    }
    
    // 分页按钮
    if (elements.prevPageBtn) {
        elements.prevPageBtn.addEventListener('click', () => changePage(-1));
    }
    
    if (elements.nextPageBtn) {
        elements.nextPageBtn.addEventListener('click', () => changePage(1));
    }
    
    // 表单提交
    if (elements.bookForm) {
        elements.bookForm.addEventListener('submit', handleFormSubmit);
    }
    
    // 模态框关闭
    if (elements.modal) {
        elements.modal.addEventListener('click', function(e) {
            if (e.target === this) {
                hideModal();
            }
        });
        
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                hideModal();
            }
        });
    }
}

/**
 * 检查 API 健康状态
 */
async function checkHealth() {
    if (!elements.healthStatus) return;
    
    setLoading(elements.healthStatus, true);
    elements.healthStatus.className = 'status-indicator status-loading';
    elements.healthStatus.innerHTML = '<span class="spinner"></span> 检查中...';
    
    try {
        const response = await fetch(API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.HEALTH);
        const data = await response.json();
        
        if (data.status === 'healthy') {
            elements.healthStatus.className = 'status-indicator status-healthy';
            elements.healthStatus.innerHTML = '✅ 服务正常 | 数据库已连接';
        } else {
            elements.healthStatus.className = 'status-indicator status-unhealthy';
            elements.healthStatus.innerHTML = '❌ 服务异常 | 数据库未连接';
        }
    } catch (error) {
        console.error('健康检查失败: - script.js:144', error);
        elements.healthStatus.className = 'status-indicator status-unhealthy';
        elements.healthStatus.innerHTML = '❌ 无法连接到后端服务';
    } finally {
        setLoading(elements.healthStatus, false);
    }
}

/**
 * 加载图书列表
 */
async function loadBooks(page = 1) {
    if (!elements.booksBody) return;
    
    setLoading(elements.booksTable, true);
    elements.booksBody.innerHTML = '<tr><td colspan="6" class="text-center">正在加载...</td></tr>';
    
    try {
        const url = new URL(API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.BOOKS);
        url.searchParams.append('page', page);
        url.searchParams.append('per_page', ITEMS_PER_PAGE);
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            currentBooks = data.data;
            currentPage = page;
            
            renderBooksTable(data.data);
            updatePagination(data.pagination);
            
            showNotification(`加载了 ${data.data.length} 本图书`, 'success');
        } else {
            throw new Error(data.message || '加载失败');
        }
    } catch (error) {
        console.error('加载图书失败: - script.js:181', error);
        elements.booksBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">
                    <div style="color: var(--danger-color);">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>加载失败: ${error.message}</p>
                        <button onclick="loadBooks()" class="btn btn-outline">重试</button>
                    </div>
                </td>
            </tr>
        `;
    } finally {
        setLoading(elements.booksTable, false);
    }
}

/**
 * 渲染图书表格
 */
function renderBooksTable(books) {
    if (!elements.booksBody) return;
    
    if (books.length === 0) {
        elements.booksBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">
                    <div style="padding: 2rem;">
                        <i class="fas fa-book" style="font-size: 3rem; color: var(--text-secondary);"></i>
                        <p style="margin-top: 1rem;">暂无图书数据</p>
                        <button onclick="initDatabase()" class="btn btn-primary mt-2">
                            <i class="fas fa-database"></i> 初始化示例数据
                        </button>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    const rows = books.map(book => `
        <tr data-book-id="${book.id}">
            <td>${book.id}</td>
            <td>
                <div class="book-title">${escapeHtml(book.title)}</div>
                <div class="book-author">${escapeHtml(book.author)}</div>
            </td>
            <td><code>${escapeHtml(book.isbn)}</code></td>
            <td>${escapeHtml(book.publisher || '未知')}</td>
            <td>
                <span class="price-tag">¥${book.price.toFixed(2)}</span>
            </td>
            <td>
                <div class="btn-group">
                    <button onclick="viewBook(${book.id})" class="btn btn-outline" title="查看详情">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button onclick="editBook(${book.id})" class="btn btn-outline" title="编辑">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteBook(${book.id})" class="btn btn-danger" title="删除">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
    
    elements.booksBody.innerHTML = rows;
}

/**
 * 加载统计信息
 */
async function loadStats() {
    if (!elements.bookCount) return;
    
    try {
        const response = await fetch(API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.STATS);
        const data = await response.json();
        
        if (data.success) {
            elements.bookCount.textContent = `总图书: ${data.data.total_books} | 平均价格: ¥${data.data.average_price.toFixed(2)}`;
        }
    } catch (error) {
        console.error('加载统计失败: - script.js:266', error);
        elements.bookCount.textContent = '统计信息加载失败';
    }
}

/**
 * 初始化数据库（添加示例数据）
 */
async function initDatabase() {
    if (!confirm('确定要初始化数据库吗？这将添加示例数据。')) {
        return;
    }
    
    setLoading(elements.initDbBtn, true);
    
    try {
        const response = await fetch(API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.INIT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(data.message, 'success');
            loadBooks(); // 重新加载图书列表
            loadStats(); // 重新加载统计
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('初始化失败: - script.js:299', error);
        showNotification(`初始化失败: ${error.message}`, 'error');
    } finally {
        setLoading(elements.initDbBtn, false);
    }
}

/**
 * 显示添加图书表单
 */
function showAddBookForm() {
    if (!elements.bookForm || !elements.modal) return;
    
    // 重置表单
    elements.bookForm.reset();
    elements.bookForm.dataset.mode = 'add';
    elements.bookForm.querySelector('h3').textContent = '添加新图书';
    
    // 显示模态框
    showModal();
}

/**
 * 查看图书详情
 */
async function viewBook(bookId) {
    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.BOOKS}/${bookId}`);
        const data = await response.json();
        
        if (data.success) {
            const book = data.data;
            const details = `
                <div class="book-card">
                    <h3 class="book-title">${escapeHtml(book.title)}</h3>
                    <p class="book-author">作者: ${escapeHtml(book.author)}</p>
                    <div class="book-meta">
                        <span>ISBN: <code>${escapeHtml(book.isbn)}</code></span>
                        <span>出版社: ${escapeHtml(book.publisher)}</span>
                        <span>价格: ¥${book.price.toFixed(2)}</span>
                    </div>
                    ${book.description ? `<p style="margin-top: 1rem;">${escapeHtml(book.description)}</p>` : ''}
                    <p style="margin-top: 1rem; color: var(--text-secondary); font-size: 0.875rem;">
                        创建时间: ${new Date(book.created_at).toLocaleString()}
                    </p>
                </div>
            `;
            
            alertModal('图书详情', details);
        }
    } catch (error) {
        console.error('查看图书失败: - script.js:350', error);
        showNotification('获取图书详情失败', 'error');
    }
}

/**
 * 编辑图书
 */
async function editBook(bookId) {
    try {
        // 先获取图书信息
        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.BOOKS}/${bookId}`);
        const data = await response.json();
        
        if (data.success) {
            const book = data.data;
            
            // 填充表单
            elements.bookForm.querySelector('[name="id"]').value = book.id;
            elements.bookForm.querySelector('[name="title"]').value = book.title;
            elements.bookForm.querySelector('[name="author"]').value = book.author;
            elements.bookForm.querySelector('[name="isbn"]').value = book.isbn;
            elements.bookForm.querySelector('[name="publisher"]').value = book.publisher || '';
            elements.bookForm.querySelector('[name="price"]').value = book.price;
            elements.bookForm.querySelector('[name="description"]').value = book.description || '';
            
            // 设置模式
            elements.bookForm.dataset.mode = 'edit';
            elements.bookForm.dataset.bookId = bookId;
            elements.bookForm.querySelector('h3').textContent = '编辑图书';
            
            // 显示模态框
            showModal();
        }
    } catch (error) {
        console.error('编辑图书失败: - script.js:385', error);
        showNotification('获取编辑信息失败', 'error');
    }
}

/**
 * 删除图书
 */
async function deleteBook(bookId) {
    if (!confirm('确定要删除这本图书吗？此操作不可撤销。')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.BOOKS}/${bookId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('图书删除成功', 'success');
            loadBooks(currentPage); // 重新加载当前页
            loadStats(); // 更新统计
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('删除失败: - script.js:413', error);
        showNotification(`删除失败: ${error.message}`, 'error');
    }
}

/**
 * 处理表单提交
 */
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const mode = form.dataset.mode;
    const submitBtn = form.querySelector('button[type="submit"]');
    
    // 收集表单数据
    const formData = {
        title: form.querySelector('[name="title"]').value.trim(),
        author: form.querySelector('[name="author"]').value.trim(),
        isbn: form.querySelector('[name="isbn"]').value.trim(),
        publisher: form.querySelector('[name="publisher"]').value.trim(),
        price: parseFloat(form.querySelector('[name="price"]').value) || 0,
        description: form.querySelector('[name="description"]').value.trim()
    };
    
    // 验证必填字段
    if (!formData.title || !formData.author || !formData.isbn) {
        showNotification('请填写标题、作者和ISBN', 'error');
        return;
    }
    
    setLoading(submitBtn, true);
    
    try {
        let url = API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.BOOKS;
        let method = 'POST';
        
        if (mode === 'edit') {
            const bookId = form.dataset.bookId;
            url = `${url}/${bookId}`;
            method = 'PUT';
        }
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(
                mode === 'add' ? '图书添加成功' : '图书更新成功',
                'success'
            );
            
            hideModal();
            loadBooks(currentPage);
            loadStats();
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('表单提交失败: - script.js:479', error);
        showNotification(`操作失败: ${error.message}`, 'error');
    } finally {
        setLoading(submitBtn, false);
    }
}

/**
 * 分页功能
 */
function changePage(delta) {
    const newPage = currentPage + delta;
    if (newPage < 1) return;
    
    loadBooks(newPage);
}

function updatePagination(pagination) {
    if (!elements.pagination || !elements.pageInfo) return;
    
    elements.pageInfo.textContent = `第 ${pagination.page} 页，共 ${pagination.total_pages} 页`;
    
    // 更新按钮状态
    if (elements.prevPageBtn) {
        elements.prevPageBtn.disabled = pagination.page <= 1;
    }
    
    if (elements.nextPageBtn) {
        elements.nextPageBtn.disabled = pagination.page >= pagination.total_pages;
    }
}

/**
 * 工具函数
 */

// 显示模态框
function showModal() {
    if (elements.modal) {
        elements.modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}

// 隐藏模态框
function hideModal() {
    if (elements.modal) {
        elements.modal.classList.add('hidden');
        document.body.style.overflow = '';
    }
}

// 显示提示模态框
function alertModal(title, content) {
    const modalHtml = `
        <div id="alert-modal" class="modal">
            <div class="modal-content" style="max-width: 500px;">
                <div class="card">
                    <div class="card-header">
                        <h3>${title}</h3>
                        <button onclick="document.getElementById('alert-modal').remove()" 
                                style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">
                            &times;
                        </button>
                    </div>
                    <div style="padding: 1rem;">
                        ${content}
                    </div>
                    <div style="text-align: right; margin-top: 1rem;">
                        <button onclick="document.getElementById('alert-modal').remove()" 
                                class="btn btn-primary">关闭</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// 显示通知
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
        <button onclick="this.parentElement.remove()" style="background: none; border: none; cursor: pointer;">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    document.body.appendChild(notification);
    
    // 自动移除
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// 设置加载状态
function setLoading(element, isLoading) {
    if (!element) return;
    
    if (isLoading) {
        element.classList.add('loading');
        if (element.tagName === 'BUTTON') {
            const originalText = element.innerHTML;
            element.dataset.originalText = originalText;
            element.innerHTML = '<span class="spinner"></span> 处理中...';
            element.disabled = true;
        }
    } else {
        element.classList.remove('loading');
        if (element.tagName === 'BUTTON' && element.dataset.originalText) {
            element.innerHTML = element.dataset.originalText;
            element.disabled = false;
            delete element.dataset.originalText;
        }
    }
}

// HTML 转义
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 导出到全局作用域（方便调试）
window.app = {
    checkHealth,
    loadBooks,
    initDatabase,
    viewBook,
    editBook,
    deleteBook,
    showAddBookForm
};

console.log('✅ 前端脚本加载完成 - script.js:621');