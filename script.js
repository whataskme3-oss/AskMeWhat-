// ==================== GLOBAL STATE ====================
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
let users = JSON.parse(localStorage.getItem('users')) || [];
let posts = JSON.parse(localStorage.getItem('posts')) || [];
let websiteOnline = JSON.parse(localStorage.getItem('websiteOnline')) !== false;
let currentFilter = 'all';
let currentPostType = 'text';

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    initializeWebsite();
    checkWebsiteStatus();
    updateUI();
    loadPosts();
    updateStats();
    createDefaultAdmin();
});

// Create default admin account
function createDefaultAdmin() {
    const adminExists = users.find(u => u.email === 'admin@gourav.com');
    if (!adminExists) {
        users.push({
            id: Date.now(),
            name: 'Admin',
            email: 'admin@gourav.com',
            password: 'admin123',
            isAdmin: true,
            avatar: 'https://ui-avatars.com/api/?name=Admin&background=7B61FF&color=fff',
            joinedDate: new Date().toISOString(),
            status: 'active',
            postsCount: 0
        });
        saveData();
    }
}

// Initialize website
function initializeWebsite() {
    console.log('🚀 Gourav Ideas - Initializing...');
    console.log('📊 Users:', users.length);
    console.log('📝 Posts:', posts.length);
}

// Check if website is online
function checkWebsiteStatus() {
    if (!websiteOnline) {
        document.getElementById('offlineOverlay').classList.remove('hidden');
    }
}

// ==================== UI UPDATES ====================
function updateUI() {
    if (currentUser) {
        // Hide guest actions, show user actions
        document.getElementById('guestActions').classList.add('hidden');
        document.getElementById('userActions').classList.remove('hidden');
        document.getElementById('createSection').classList.remove('hidden');
        
        // Update user info
        const avatarUrl = currentUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=7B61FF&color=fff`;
        
        document.getElementById('userAvatar').src = avatarUrl;
        document.getElementById('userName').textContent = currentUser.name.split(' ')[0];
        document.getElementById('menuAvatar').src = avatarUrl;
        document.getElementById('menuUserName').textContent = currentUser.name;
        document.getElementById('menuUserEmail').textContent = currentUser.email;
        document.getElementById('createUserAvatar').src = avatarUrl;
        document.getElementById('createUserName').textContent = currentUser.name.split(' ')[0];
        
        // Show admin link if user is admin
        if (currentUser.isAdmin) {
            document.getElementById('adminLink').classList.remove('hidden');
            document.getElementById('adminDivider').classList.remove('hidden');
        }
    } else {
        // Show guest actions, hide user actions
        document.getElementById('guestActions').classList.remove('hidden');
        document.getElementById('userActions').classList.add('hidden');
        document.getElementById('createSection').classList.add('hidden');
    }
}

// Update statistics
function updateStats() {
    const totalUsers = users.length;
    const totalPosts = posts.length;
    const totalPdfs = posts.filter(p => p.type === 'pdf').length;
    
    document.getElementById('totalUsers').textContent = totalUsers;
    document.getElementById('totalPosts').textContent = totalPosts;
    document.getElementById('totalPdfs').textContent = totalPdfs;
}

// ==================== AUTHENTICATION ====================
function showAuth(type) {
    const modal = document.getElementById('authModal');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (type === 'login') {
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
    } else {
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
    }
    
    modal.classList.add('active');
}

function closeAuthModal() {
    document.getElementById('authModal').classList.remove('active');
}

function switchAuthForm(type) {
    showAuth(type);
}

// Handle login
function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
        if (user.status === 'blocked') {
            showToast('Your account has been blocked!', 'error');
            return;
        }
        
        currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(user));
        
        closeAuthModal();
        updateUI();
        loadPosts();
        showToast(`Welcome back, ${user.name}!`, 'success');
        
        logActivity('user', `${user.name} logged in`);
    } else {
        showToast('Invalid email or password!', 'error');
    }
}

// Handle registration
function handleRegister(e) {
    e.preventDefault();
    
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    
    // Check if email already exists
    if (users.find(u => u.email === email)) {
        showToast('Email already registered!', 'error');
        return;
    }
    
    // Create new user
    const newUser = {
        id: Date.now(),
        name: name,
        email: email,
        password: password,
        isAdmin: false,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=7B61FF&color=fff`,
        joinedDate: new Date().toISOString(),
        status: 'active',
        postsCount: 0
    };
    
    users.push(newUser);
    currentUser = newUser;
    
    saveData();
    localStorage.setItem('currentUser', JSON.stringify(newUser));
    
    closeAuthModal();
    updateUI();
    showToast(`Account created! Welcome, ${name}!`, 'success');
    
    logActivity('user', `New user registered: ${name}`);
}

// Handle logout
function handleLogout() {
    if (confirm('Are you sure you want to sign out?')) {
        logActivity('user', `${currentUser.name} logged out`);
        
        currentUser = null;
        localStorage.removeItem('currentUser');
        
        updateUI();
        loadPosts();
        showToast('Signed out successfully', 'info');
    }
}

// ==================== POST MANAGEMENT ====================
function openCreateModal(type = 'text') {
    if (!currentUser) {
        showToast('Please sign in to create posts', 'error');
        showAuth('login');
        return;
    }
    
    document.getElementById('createModal').classList.add('active');
    switchType(type);
}

function closeCreateModal() {
    document.getElementById('createModal').classList.remove('active');
    document.getElementById('createPostForm').reset();
    document.getElementById('imagePreview').innerHTML = '';
    document.getElementById('pdfPreview').innerHTML = '';
}

function switchType(type) {
    currentPostType = type;
    
    // Update tabs
    document.querySelectorAll('.type-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.type === type) {
            tab.classList.add('active');
        }
    });
    
    // Update content areas
    document.getElementById('textTab').classList.add('hidden');
    document.getElementById('imageTab').classList.add('hidden');
    document.getElementById('pdfTab').classList.add('hidden');
    document.getElementById(type + 'Tab').classList.remove('hidden');
}

// Handle image upload
function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 10 * 1024 * 1024) {
        showToast('Image size must be less than 10MB', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(event) {
        document.getElementById('imagePreview').innerHTML = `
            <img src="${event.target.result}" alt="Preview">
        `;
    };
    reader.readAsDataURL(file);
}

// Handle PDF upload
function handlePDFUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 20 * 1024 * 1024) {
        showToast('PDF size must be less than 20MB', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(event) {
        document.getElementById('pdfPreview').innerHTML = `
            <div style="padding: 20px; background: var(--bg-tertiary); border-radius: var(--radius-lg); text-align: center;">
                <div style="width: 60px; height: 60px; margin: 0 auto 12px; background: var(--accent-red); border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; font-size: 28px; color: white;">
                    <i class="fas fa-file-pdf"></i>
                </div>
                <h4 style="margin-bottom: 4px;">${file.name}</h4>
                <p style="color: var(--text-tertiary); font-size: 13px;">${(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
        `;
    };
    reader.readAsDataURL(file);
}

// Handle create post
function handleCreatePost(e) {
    e.preventDefault();
    
    if (!currentUser) {
        showToast('Please sign in first', 'error');
        return;
    }
    
    const title = document.getElementById('postTitle').value.trim();
    
    if (!title) {
        showToast('Please enter a title', 'error');
        return;
    }
    
    const post = {
        id: Date.now(),
        type: currentPostType,
        title: title,
        authorId: currentUser.id,
        authorName: currentUser.name,
        authorAvatar: currentUser.avatar,
        createdAt: new Date().toISOString(),
        likes: 0,
        comments: 0,
        views: 0
    };
    
    if (currentPostType === 'text') {
        const content = document.getElementById('postContent').value.trim();
        if (!content) {
            showToast('Please enter some content', 'error');
            return;
        }
        post.content = content;
        savePost(post);
    } else if (currentPostType === 'image') {
        const imageFile = document.getElementById('imageInput').files[0];
        if (!imageFile) {
            showToast('Please select an image', 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(event) {
            post.imageData = event.target.result;
            savePost(post);
        };
        reader.readAsDataURL(imageFile);
    } else if (currentPostType === 'pdf') {
        const pdfFile = document.getElementById('pdfInput').files[0];
        if (!pdfFile) {
            showToast('Please select a PDF', 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(event) {
            post.pdfData = {
                name: pdfFile.name,
                size: pdfFile.size,
                data: event.target.result
            };
            savePost(post);
        };
        reader.readAsDataURL(pdfFile);
    }
}

// Save post
function savePost(post) {
    posts.unshift(post);
    
    // Update user post count
    const userIndex = users.findIndex(u => u.id === currentUser.id);
    if (userIndex !== -1) {
        users[userIndex].postsCount = (users[userIndex].postsCount || 0) + 1;
        currentUser.postsCount = users[userIndex].postsCount;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
    }
    
    saveData();
    closeCreateModal();
    loadPosts();
    updateStats();
    showToast('Post published successfully!', 'success');
    
    logActivity('post', `New ${post.type} post created: "${post.title}"`);
}

// Load posts
function loadPosts() {
    const container = document.getElementById('postsContainer');
    
    let filteredPosts = posts;
    if (currentFilter !== 'all') {
        filteredPosts = posts.filter(p => p.type === currentFilter);
    }
    
    if (filteredPosts.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; color: var(--text-secondary);">
                <i class="fas fa-inbox" style="font-size: 64px; margin-bottom: 20px; opacity: 0.3;"></i>
                <h3 style="margin-bottom: 8px;">No posts yet</h3>
                <p>Be the first to share something!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filteredPosts.map(post => createPostHTML(post)).join('');
}

// Create post HTML
function createPostHTML(post) {
    const timeAgo = getTimeAgo(post.createdAt);
    const canDelete = currentUser && (currentUser.id === post.authorId || currentUser.isAdmin);
    
    let contentHTML = '';
    
    if (post.type === 'text') {
        contentHTML = `
            <div class="post-content">
                <h3 class="post-title">${escapeHTML(post.title)}</h3>
                <p class="post-text">${escapeHTML(post.content)}</p>
            </div>
        `;
    } else if (post.type === 'image') {
        contentHTML = `
            <div class="post-content">
                <h3 class="post-title">${escapeHTML(post.title)}</h3>
            </div>
            <img src="${post.imageData}" alt="${escapeHTML(post.title)}" class="post-image">
        `;
    } else if (post.type === 'pdf') {
        contentHTML = `
            <div class="post-content">
                <h3 class="post-title">${escapeHTML(post.title)}</h3>
            </div>
            <div class="post-pdf">
                <div class="pdf-icon">
                    <i class="fas fa-file-pdf"></i>
                </div>
                <div class="pdf-details">
                    <h4 class="pdf-name">${escapeHTML(post.pdfData.name)}</h4>
                    <p class="pdf-size">${(post.pdfData.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button class="pdf-download-btn" onclick="downloadPDF(${post.id})">
                    <i class="fas fa-download"></i>
                    Download
                </button>
            </div>
        `;
    }
    
    return `
        <div class="post-card" data-id="${post.id}">
            <div class="post-header">
                <div class="post-author-info">
                    <img src="${post.authorAvatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(post.authorName)}" alt="${escapeHTML(post.authorName)}" class="post-avatar">
                    <div>
                        <div class="post-author-name">${escapeHTML(post.authorName)}</div>
                        <div class="post-time">${timeAgo}</div>
                    </div>
                </div>
                <button class="post-menu">
                    <i class="fas fa-ellipsis-h"></i>
                </button>
            </div>
            
            ${contentHTML}
            
            <div class="post-actions">
                <button class="post-action-btn">
                    <i class="fas fa-heart"></i>
                    <span>${post.likes || 0}</span>
                </button>
                <button class="post-action-btn">
                    <i class="fas fa-comment"></i>
                    <span>${post.comments || 0}</span>
                </button>
                <button class="post-action-btn">
                    <i class="fas fa-share"></i>
                    <span>Share</span>
                </button>
                ${canDelete ? `
                    <button class="post-action-btn delete" onclick="deletePost(${post.id})">
                        <i class="fas fa-trash"></i>
                        <span>Delete</span>
                    </button>
                ` : ''}
            </div>
        </div>
    `;
}

// Filter posts
function filterPosts(type) {
    currentFilter = type;
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === type) {
            btn.classList.add('active');
        }
    });
    
    loadPosts();
}

// Delete post
function deletePost(postId) {
    if (!confirm('Are you sure you want to delete this post?')) {
        return;
    }
    
    const postIndex = posts.findIndex(p => p.id === postId);
    if (postIndex === -1) return;
    
    const post = posts[postIndex];
    posts.splice(postIndex, 1);
    
    // Update user post count
    const userIndex = users.findIndex(u => u.id === post.authorId);
    if (userIndex !== -1 && users[userIndex].postsCount > 0) {
        users[userIndex].postsCount--;
    }
    
    saveData();
    loadPosts();
    updateStats();
    showToast('Post deleted successfully', 'success');
    
    logActivity('post', `Post deleted: "${post.title}"`);
}

// Download PDF
function downloadPDF(postId) {
    const post = posts.find(p => p.id === postId);
    if (!post || !post.pdfData) return;
    
    const link = document.createElement('a');
    link.href = post.pdfData.data;
    link.download = post.pdfData.name;
    link.click();
    
    showToast('PDF downloaded!', 'success');
}

// ==================== USER MENU ====================
function toggleUserMenu() {
    const dropdown = document.getElementById('userMenuDropdown');
    dropdown.classList.toggle('active');
}

function toggleNotifications() {
    showToast('Notifications feature coming soon!', 'info');
}

// Close dropdowns when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.user-menu')) {
        document.getElementById('userMenuDropdown')?.classList.remove('active');
    }
});

// ==================== UTILITY FUNCTIONS ====================
function saveData() {
    localStorage.setItem('users', JSON.stringify(users));
    localStorage.setItem('posts', JSON.stringify(posts));
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'toastSlide 0.3s ease-out reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function getTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    const intervals = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60
    };
    
    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / secondsInUnit);
        if (interval >= 1) {
            return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
        }
    }
    
    return 'Just now';
}

function escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function logActivity(type, message) {
    const activities = JSON.parse(localStorage.getItem('activities')) || [];
    activities.unshift({
        id: Date.now(),
        type: type,
        message: message,
        timestamp: new Date().toISOString()
    });
    
    // Keep only last 100 activities
    if (activities.length > 100) {
        activities.pop();
    }
    
    localStorage.setItem('activities', JSON.stringify(activities));
}

// ==================== MODAL HANDLERS ====================
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeCreateModal();
        closeAuthModal();
    }
});