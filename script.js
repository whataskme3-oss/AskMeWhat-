// ===== GLOBAL VARIABLES =====
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
let users = JSON.parse(localStorage.getItem('users')) || [];
let posts = JSON.parse(localStorage.getItem('posts')) || [];
let websiteStatus = JSON.parse(localStorage.getItem('websiteStatus')) !== false;
let currentPostType = 'text';
let currentFilter = 'all';

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    checkWebsiteStatus();
    updateUI();
    loadPosts();
    updateStats();
    
    // Create admin account if not exists
    if (!users.find(u => u.email === 'admin@gourav.com')) {
        users.push({
            id: Date.now(),
            name: 'Admin',
            email: 'admin@gourav.com',
            password: 'admin123',
            isAdmin: true,
            status: 'active',
            joinedDate: new Date().toISOString(),
            postsCount: 0
        });
        localStorage.setItem('users', JSON.stringify(users));
    }
});

// ===== WEBSITE STATUS =====
function checkWebsiteStatus() {
    if (!websiteStatus) {
        document.getElementById('websiteOffline').classList.remove('hidden');
    }
}

function toggleWebsite() {
    websiteStatus = document.getElementById('websiteStatus').checked;
    localStorage.setItem('websiteStatus', JSON.stringify(websiteStatus));
    
    if (websiteStatus) {
        showNotification('Website is now ONLINE', 'success');
    } else {
        showNotification('Website is now OFFLINE', 'warning');
    }
}

// ===== AUTHENTICATION =====
function openModal(type) {
    document.getElementById('authModal').style.display = 'block';
    if (type === 'login') {
        document.getElementById('loginForm').classList.remove('hidden');
        document.getElementById('registerForm').classList.add('hidden');
    } else {
        document.getElementById('loginForm').classList.add('hidden');
        document.getElementById('registerForm').classList.remove('hidden');
    }
}

function closeModal() {
    document.getElementById('authModal').style.display = 'none';
}

function login(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
        if (user.status === 'blocked') {
            showNotification('Your account has been blocked!', 'error');
            return;
        }
        
        currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(user));
        showNotification(`Welcome back, ${user.name}!`, 'success');
        closeModal();
        updateUI();
    } else {
        showNotification('Invalid credentials!', 'error');
    }
}

function register(event) {
    event.preventDefault();
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    
    if (users.find(u => u.email === email)) {
        showNotification('Email already exists!', 'error');
        return;
    }
    
    const newUser = {
        id: Date.now(),
        name,
        email,
        password,
        isAdmin: false,
        status: 'active',
        joinedDate: new Date().toISOString(),
        postsCount: 0
    };
    
    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    
    currentUser = newUser;
    localStorage.setItem('currentUser', JSON.stringify(newUser));
    
    showNotification('Account created successfully!', 'success');
    closeModal();
    updateUI();
}

function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    showNotification('Logged out successfully!', 'success');
    updateUI();
}

// ===== UI UPDATES =====
function updateUI() {
    if (currentUser) {
        document.getElementById('authBtn').classList.add('hidden');
        document.getElementById('userProfile').classList.remove('hidden');
        document.getElementById('userName').textContent = currentUser.name;
        document.getElementById('createPostSection').classList.remove('hidden');
        
        if (currentUser.isAdmin) {
            document.getElementById('adminBtn').classList.remove('hidden');
        }
    } else {
        document.getElementById('authBtn').classList.remove('hidden');
        document.getElementById('userProfile').classList.add('hidden');
        document.getElementById('createPostSection').classList.add('hidden');
        document.getElementById('adminBtn').classList.add('hidden');
    }
}

// ===== POST MANAGEMENT =====
function selectPostType(type) {
    currentPostType = type;
    
    // Update buttons
    document.querySelectorAll('.type-btn').forEach(btn => btn.classList.remove('active'));
    event.target.closest('.type-btn').classList.add('active');
    
    // Show/hide inputs
    document.getElementById('textInput').classList.add('hidden');
    document.getElementById('imageInput').classList.add('hidden');
    document.getElementById('pdfInput').classList.add('hidden');
    
    document.getElementById(type + 'Input').classList.remove('hidden');
}

function previewImage(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('imagePreview');
    
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
        };
        reader.readAsDataURL(file);
    }
}

function previewPDF(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('pdfPreview');
    
    if (file) {
        preview.innerHTML = `
            <i class="fas fa-file-pdf" style="font-size: 3rem; color: var(--accent);"></i>
            <p>${file.name}</p>
            <p>${(file.size / 1024 / 1024).toFixed(2)} MB</p>
        `;
    }
}

function createPost(event) {
    event.preventDefault();
    
    if (!currentUser) {
        showNotification('Please login first!', 'error');
        return;
    }
    
    const title = document.getElementById('postTitle').value;
    let content = '';
    let fileData = null;
    
    if (currentPostType === 'text') {
        content = document.getElementById('postContent').value;
    } else if (currentPostType === 'image') {
        const file = document.getElementById('imageFile').files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                savePost(title, content, currentPostType, e.target.result);
            };
            reader.readAsDataURL(file);
            return;
        }
    } else if (currentPostType === 'pdf') {
        const file = document.getElementById('pdfFile').files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                fileData = {
                    name: file.name,
                    size: file.size,
                    data: e.target.result
                };
                savePost(title, content, currentPostType, fileData);
            };
            reader.readAsDataURL(file);
            return;
        }
    }
    
    savePost(title, content, currentPostType, fileData);
}

function savePost(title, content, type, fileData) {
    const post = {
        id: Date.now(),
        title,
        content,
        type,
        fileData,
        authorId: currentUser.id,
        authorName: currentUser.name,
        createdAt: new Date().toISOString(),
        likes: 0,
        comments: 0
    };
    
    posts.unshift(post);
    localStorage.setItem('posts', JSON.stringify(posts));
    
    // Update user post count
    const userIndex = users.findIndex(u => u.id === currentUser.id);
    if (userIndex !== -1) {
        users[userIndex].postsCount++;
        localStorage.setItem('users', JSON.stringify(users));
    }
    
    showNotification('Post created successfully!', 'success');
    document.getElementById('postForm').reset();
    document.getElementById('imagePreview').innerHTML = '';
    document.getElementById('pdfPreview').innerHTML = '';
    loadPosts();
    updateStats();
}

function loadPosts() {
    const container = document.getElementById('postsContainer');
    let filteredPosts = posts;
    
    if (currentFilter !== 'all') {
        filteredPosts = posts.filter(p => p.type === currentFilter);
    }
    
    if (filteredPosts.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); grid-column: 1/-1;">No posts yet. Be the first to share something!</p>';
        return;
    }
    
    container.innerHTML = filteredPosts.map(post => `
        <div class="post-card" data-type="${post.type}">
            <span class="post-type-badge ${post.type}">${post.type.toUpperCase()}</span>
            <div class="post-header">
                <img src="https://ui-avatars.com/api/?name=${post.authorName}&background=667eea&color=fff" 
                     alt="${post.authorName}" class="post-author-img">
                <div class="post-author-info">
                    <h4>${post.authorName}</h4>
                    <span>${formatDate(post.createdAt)}</span>
                </div>
            </div>
            <h3 class="post-title">${post.title}</h3>
            ${post.type === 'text' ? `<p class="post-content">${post.content}</p>` : ''}
            ${post.type === 'image' ? `<img src="${post.fileData}" alt="${post.title}" class="post-image">` : ''}
            ${post.type === 'pdf' ? `
                <div class="post-pdf-preview">
                    <i class="fas fa-file-pdf"></i>
                    <p>${post.fileData.name}</p>
                    <p>${(post.fileData.size / 1024 / 1024).toFixed(2)} MB</p>
                    <button class="pdf-download-btn" onclick="downloadPDF(${post.id})">
                        <i class="fas fa-download"></i> Download PDF
                    </button>
                </div>
            ` : ''}
            <div class="post-actions">
                <button class="action-icon"><i class="fas fa-heart"></i> ${post.likes}</button>
                <button class="action-icon"><i class="fas fa-comment"></i> ${post.comments}</button>
                <button class="action-icon"><i class="fas fa-share"></i> Share</button>
                ${currentUser && (currentUser.id === post.authorId || currentUser.isAdmin) ? 
                    `<button class="delete-post-btn" onclick="deletePost(${post.id})">
                        <i class="fas fa-trash"></i> Delete
                    </button>` : ''}
            </div>
        </div>
    `).join('');
}

function filterPosts(type) {
    currentFilter = type;
    
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    loadPosts();
}

function deletePost(postId) {
    if (confirm('Are you sure you want to delete this post?')) {
        posts = posts.filter(p => p.id !== postId);
        localStorage.setItem('posts', JSON.stringify(posts));
        loadPosts();
        updateStats();
        showNotification('Post deleted successfully!', 'success');
    }
}

function downloadPDF(postId) {
    const post = posts.find(p => p.id === postId);
    if (post && post.fileData) {
        const link = document.createElement('a');
        link.href = post.fileData.data;
        link.download = post.fileData.name;
        link.click();
        showNotification('PDF downloaded!', 'success');
    }
}

// ===== STATISTICS =====
function updateStats() {
    document.getElementById('totalUsers').textContent = users.length;
    document.getElementById('totalPosts').textContent = posts.length;
    document.getElementById('totalPDFs').textContent = posts.filter(p => p.type === 'pdf').length;
}

// ===== ADMIN FUNCTIONS =====
function loadAdminData() {
    // Update stats
    document.getElementById('adminTotalUsers').textContent = users.length;
    document.getElementById('adminTotalPosts').textContent = posts.length;
    document.getElementById('adminTotalPDFs').textContent = posts.filter(p => p.type === 'pdf').length;
    document.getElementById('adminBlockedUsers').textContent = users.filter(u => u.status === 'blocked').length;
    
    // Quick stats
    const today = new Date().toDateString();
    const postsToday = posts.filter(p => new Date(p.createdAt).toDateString() === today).length;
    document.getElementById('postsToday').textContent = postsToday;
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const newUsers = users.filter(u => new Date(u.joinedDate) > weekAgo).length;
    document.getElementById('newUsersWeek').textContent = newUsers;
    
    // Storage (simulated)
    const totalSize = posts.reduce((acc, post) => {
        if (post.fileData && post.fileData.size) {
            return acc + post.fileData.size;
        }
        return acc;
    }, 0);
    document.getElementById('storageUsed').textContent = (totalSize / 1024 / 1024).toFixed(2) + ' MB';
    
    // Recent activity
    loadRecentActivity();
    
    // Load users table
    loadUsersTable();
    
    // Load admin posts
    loadAdminPosts();
    
    // Load analytics
    loadAnalytics();
    
    // Load website status
    const websiteStatus = JSON.parse(localStorage.getItem('websiteStatus')) !== false;
    document.getElementById('websiteStatus').checked = websiteStatus;
}

function loadRecentActivity() {
    const container = document.getElementById('recentActivity');
    const recentPosts = posts.slice(0, 5);
    
    container.innerHTML = recentPosts.map(post => `
        <div class="activity-item">
            <strong>${post.authorName}</strong> created a ${post.type} post
            <br><small>${formatDate(post.createdAt)}</small>
        </div>
    `).join('') || '<p>No recent activity</p>';
}

function loadUsersTable() {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = users.map(user => `
        <tr>
            <td>#${user.id}</td>
            <td>${user.name}${user.isAdmin ? ' <span style="color: #f56565;">★</span>' : ''}</td>
            <td>${user.email}</td>
            <td><span class="status-badge ${user.status}">${user.status.toUpperCase()}</span></td>
            <td>${user.postsCount || 0}</td>
            <td>${formatDate(user.joinedDate)}</td>
            <td>
                ${!user.isAdmin ? `
                    ${user.status === 'active' ? 
                        `<button class="table-action-btn block" onclick="toggleUserStatus(${user.id})">Block</button>` :
                        `<button class="table-action-btn unblock" onclick="toggleUserStatus(${user.id})">Unblock</button>`
                    }
                    <button class="table-action-btn delete" onclick="deleteUser(${user.id})">Delete</button>
                ` : '<em>Admin</em>'}
            </td>
        </tr>
    `).join('');
}

function toggleUserStatus(userId) {
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
        users[userIndex].status = users[userIndex].status === 'active' ? 'blocked' : 'active';
        localStorage.setItem('users', JSON.stringify(users));
        loadAdminData();
        showNotification(`User ${users[userIndex].status === 'blocked' ? 'blocked' : 'unblocked'}!`, 'success');
    }
}

function deleteUser(userId) {
    if (confirm('Are you sure you want to delete this user? All their posts will be deleted too.')) {
        users = users.filter(u => u.id !== userId);
        posts = posts.filter(p => p.authorId !== userId);
        localStorage.setItem('users', JSON.stringify(users));
        localStorage.setItem('posts', JSON.stringify(posts));
        loadAdminData();
        showNotification('User deleted!', 'success');
    }
}

function loadAdminPosts() {
    const container = document.getElementById('adminPostsContainer');
    container.innerHTML = posts.map(post => {
        const author = users.find(u => u.id === post.authorId);
        return `
            <div class="post-card" data-type="${post.type}">
                <span class="post-type-badge ${post.type}">${post.type.toUpperCase()}</span>
                <h3 class="post-title">${post.title}</h3>
                <p style="color: #666;">By: ${author ? author.name : 'Unknown'}</p>
                <p style="color: #999; font-size: 0.9rem;">${formatDate(post.createdAt)}</p>
                <button class="delete-post-btn" onclick="deletePostAdmin(${post.id})">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        `;
    }).join('') || '<p style="grid-column: 1/-1; text-align: center;">No posts yet</p>';
}

function deletePostAdmin(postId) {
    deletePost(postId);
    loadAdminData();
}

function searchUsers() {
    const query = document.getElementById('userSearch').value.toLowerCase();
    const rows = document.querySelectorAll('#usersTableBody tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(query) ? '' : 'none';
    });
}

function searchPosts() {
    const query = document.getElementById('postSearch').value.toLowerCase();
    const cards = document.querySelectorAll('#adminPostsContainer .post-card');
    
    cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(query) ? '' : 'none';
    });
}

function filterAdminPosts() {
    const type = document.getElementById('postTypeFilter').value;
    const cards = document.querySelectorAll('#adminPostsContainer .post-card');
    
    cards.forEach(card => {
        if (type === 'all' || card.dataset.type === type) {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });
}

function refreshUsers() {
    loadUsersTable();
    showNotification('Users refreshed!', 'success');
}

function refreshPosts() {
    loadAdminPosts();
    showNotification('Posts refreshed!', 'success');
}

function saveSettings() {
    showNotification('Settings saved successfully!', 'success');
}

function clearAllPosts() {
    if (confirm('⚠️ WARNING: This will delete ALL posts permanently! Are you absolutely sure?')) {
        posts = [];
        localStorage.setItem('posts', JSON.stringify(posts));
        loadAdminData();
        showNotification('All posts deleted!', 'warning');
    }
}

function clearAllUsers() {
    if (confirm('⚠️ WARNING: This will delete ALL users (except admin) permanently! Are you absolutely sure?')) {
        users = users.filter(u => u.isAdmin);
        posts = [];
        localStorage.setItem('users', JSON.stringify(users));
        localStorage.setItem('posts', JSON.stringify(posts));
        loadAdminData();
        showNotification('All users removed!', 'warning');
    }
}

function resetWebsite() {
    if (confirm('⚠️ DANGER: This will reset the ENTIRE website to default state! Continue?')) {
        if (confirm('This action cannot be undone. Are you 100% sure?')) {
            localStorage.clear();
            location.reload();
        }
    }
}

function exportData() {
    const data = {
        users,
        posts,
        exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `gourav-ideas-backup-${Date.now()}.json`;
    link.click();
    
    showNotification('Data exported successfully!', 'success');
}

function generateBackup() {
    exportData();
}

function loadAnalytics() {
    const textPosts = posts.filter(p => p.type === 'text').length;
    const imagePosts = posts.filter(p => p.type === 'image').length;
    const pdfPosts = posts.filter(p => p.type === 'pdf').length;
    
    document.getElementById('textPostsCount').textContent = textPosts;
    document.getElementById('imagePostsCount').textContent = imagePosts;
    document.getElementById('pdfPostsCount').textContent = pdfPosts;
}

function showSection(section) {
    document.querySelectorAll('.admin-section').forEach(s => s.classList.add('hidden'));
    document.getElementById(section).classList.remove('hidden');
    
    document.querySelectorAll('.admin-nav a').forEach(a => a.classList.remove('active'));
    event.target.classList.add('active');
    
    const titles = {
        dashboard: '<i class="fas fa-chart-line"></i> Dashboard',
        users: '<i class="fas fa-users"></i> User Management',
        posts: '<i class="fas fa-file-alt"></i> Posts Management',
        settings: '<i class="fas fa-cog"></i> Website Settings',
        analytics: '<i class="fas fa-chart-pie"></i> Analytics'
    };
    
    document.getElementById('sectionTitle').innerHTML = titles[section];
}

// ===== UTILITY FUNCTIONS =====
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 7) {
        return date.toLocaleDateString();
    } else if (days > 0) {
        return `${days} day${days > 1 ? 's' : ''} ago`;
    } else if (hours > 0) {
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (minutes > 0) {
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else {
        return 'Just now';
    }
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 2rem;
        background: ${type === 'success' ? 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' : 
                     type === 'error' ? 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' :
                     'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'};
        color: white;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        animation: slideIn 0.3s;
        font-weight: bold;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
    }
`;
document.head.appendChild(style);