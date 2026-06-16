// ==================== ADMIN INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    checkAdminAccess();
    loadAdminData();
    startAutoRefresh();
});

// Check if user has admin access
function checkAdminAccess() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    if (!currentUser || !currentUser.isAdmin) {
        alert('⛔ Access Denied!\n\nYou need admin privileges to access this panel.');
        window.location.href = 'index.html';
        return;
    }
    
    // Update admin info
    document.getElementById('adminUserName').textContent = currentUser.name;
    document.getElementById('adminAvatar').src = currentUser.avatar;
}

// ==================== DATA LOADING ====================
function loadAdminData() {
    const users = JSON.parse(localStorage.getItem('users')) || [];
    const posts = JSON.parse(localStorage.getItem('posts')) || [];
    const websiteOnline = JSON.parse(localStorage.getItem('websiteOnline')) !== false;
    
    // Update counts
    document.getElementById('userCount').textContent = users.length;
    document.getElementById('postCount').textContent = posts.length;
    
    // Update dashboard stats
    updateDashboardStats(users, posts);
    loadRecentActivity();
    loadUsersTable(users);
    loadPostsGrid(posts);
    loadAnalytics(posts);
    
    // Update website toggle
    document.getElementById('websiteToggle').checked = websiteOnline;
}

// Update dashboard statistics
function updateDashboardStats(users, posts) {
    const blockedUsers = users.filter(u => u.status === 'blocked').length;
    const pdfPosts = posts.filter(p => p.type === 'pdf').length;
    
    document.getElementById('dashTotalUsers').textContent = users.length;
    document.getElementById('dashTotalPosts').textContent = posts.length;
    document.getElementById('dashTotalPdfs').textContent = pdfPosts;
    document.getElementById('dashBlockedUsers').textContent = blockedUsers;
    
    // Calculate weekly changes
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const newUsersThisWeek = users.filter(u => new Date(u.joinedDate) > weekAgo).length;
    const newPostsThisWeek = posts.filter(p => new Date(p.createdAt) > weekAgo).length;
    
    document.getElementById('usersChange').textContent = `+${newUsersThisWeek}`;
    document.getElementById('postsChange').textContent = `+${newPostsThisWeek}`;
    
    // Calculate storage
    let totalStorage = 0;
    posts.forEach(post => {
        if (post.imageData) {
            totalStorage += post.imageData.length;
        }
        if (post.pdfData) {
            totalStorage += post.pdfData.data.length;
        }
    });
    
    document.getElementById('storageUsed').textContent = (totalStorage / 1024 / 1024).toFixed(2) + ' MB';
    
    // Update quick stats
    const totalLikes = posts.reduce((sum, p) => sum + (p.likes || 0), 0);
    const totalViews = posts.reduce((sum, p) => sum + (p.views || 0), 0);
    
    document.getElementById('totalViews').textContent = totalViews;
    document.getElementById('totalLikes').textContent = totalLikes;
}

// Load recent activity
function loadRecentActivity() {
    const activities = JSON.parse(localStorage.getItem('activities')) || [];
    const container = document.getElementById('recentActivity');
    
    if (activities.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">No recent activity</p>';
        return;
    }
    
    container.innerHTML = activities.slice(0, 5).map(activity => {
        const timeAgo = getTimeAgo(activity.timestamp);
        const iconClass = activity.type === 'user' ? 'fa-user' : activity.type === 'post' ? 'fa-file-alt' : 'fa-cog';
        
        return `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="fas ${iconClass}"></i>
                </div>
                <div class="activity-content">
                    <p>${activity.message}</p>
                    <span>${timeAgo}</span>
                </div>
            </div>
        `;
    }).join('');
}

// ==================== USERS MANAGEMENT ====================
function loadUsersTable(users) {
    const tbody = document.getElementById('usersTableBody');
    
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: var(--text-secondary);">No users found</td></tr>';
        return;
    }
    
    tbody.innerHTML = users.map(user => {
        const joinedDate = new Date(user.joinedDate).toLocaleDateString();
        const statusClass = user.status === 'active' ? 'success' : 'danger';
        const statusText = user.status === 'active' ? 'Active' : 'Blocked';
        
        return `
            <tr>
                <td>
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <img src="${user.avatar}" alt="${user.name}" style="width: 40px; height: 40px; border-radius: 50%;">
                        <div>
                            <strong>${escapeHTML(user.name)}</strong>
                            ${user.isAdmin ? '<span class="badge badge-admin" style="margin-left: 8px;">ADMIN</span>' : ''}
                        </div>
                    </div>
                </td>
                <td>${escapeHTML(user.email)}</td>
                <td>${user.postsCount || 0}</td>
                <td><span class="badge badge-${statusClass}">${statusText}</span></td>
                <td>${joinedDate}</td>
                <td>
                    ${!user.isAdmin ? `
                        <button class="btn-icon" onclick="toggleUserStatus(${user.id})" title="${user.status === 'active' ? 'Block' : 'Unblock'} User">
                            <i class="fas fa-${user.status === 'active' ? 'ban' : 'check'}"></i>
                        </button>
                        <button class="btn-icon" onclick="deleteUser(${user.id})" title="Delete User">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : '<span style="color: var(--text-tertiary);">Protected</span>'}
                </td>
            </tr>
        `;
    }).join('');
}

// Toggle user status (block/unblock)
function toggleUserStatus(userId) {
    const users = JSON.parse(localStorage.getItem('users')) || [];
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) return;
    
    const user = users[userIndex];
    const newStatus = user.status === 'active' ? 'blocked' : 'active';
    
    if (confirm(`Are you sure you want to ${newStatus === 'blocked' ? 'block' : 'unblock'} ${user.name}?`)) {
        users[userIndex].status = newStatus;
        