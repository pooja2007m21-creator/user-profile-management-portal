/**
 * User Profile Management Portal - Admin Module
 */

let currentPage = 1;
let perPage = 10;
let currentSearch = '';
let currentRole = '';
let currentStatus = '';
let currentSort = 'created_at';
let currentSortOrder = 'desc';

let deleteTargetUserId = null;
let editTargetUserId = null;

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Check if Admin Login Page
    const adminLoginForm = document.getElementById('admin-login-form');
    if (adminLoginForm) {
        initAdminLogin();
        return;
    }

    // 2. Protect Admin Pages
    if (!requireAuth('ADMIN')) return;

    // Mini Admin info in sidebar
    const adminUser = getStoredUser();
    if (adminUser) {
        const sidebarName = document.getElementById('admin-sidebar-name');
        const sidebarRole = document.getElementById('admin-sidebar-role');
        if (sidebarName) sidebarName.textContent = adminUser.full_name;
        if (sidebarRole) sidebarRole.textContent = 'Administrator';
    }

    // Sidebar Mobile Toggle
    const toggleBtn = document.getElementById('sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', () => sidebar.classList.toggle('show'));
    }

    // 3. Admin Dashboard Page
    const isDashboard = document.getElementById('admin-stats-container') !== null;
    if (isDashboard) {
        await loadAdminDashboard();
    }

    // 4. Admin Users Management Page
    const isUsersPage = document.getElementById('admin-users-table-body') !== null;
    if (isUsersPage) {
        initUsersManagement();
        await loadAdminUsers();
    }

    // 5. Admin User Detail Page
    const isDetailPage = document.getElementById('admin-user-details-card') !== null;
    if (isDetailPage) {
        await loadAdminUserDetails();
    }
});

// Admin Login Handler
function initAdminLogin() {
    const loginForm = document.getElementById('admin-login-form');
    if (!loginForm) return;

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;

        const usernameOrEmail = document.getElementById('admin_username').value.trim();
        const password = document.getElementById('admin_password').value;

        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Authenticating...';

            const response = await apiRequest('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify({
                    username_or_email: usernameOrEmail,
                    password: password
                })
            });

            if (response.user.role !== 'ADMIN') {
                showToast('Access Denied', 'The specified account does not possess Administrator privileges.', 'error');
                return;
            }

            setAuthToken(response.access_token, false);
            setStoredUser(response.user, false);

            showToast('Admin Authenticated', `Welcome, ${response.user.full_name}`, 'success');
            setTimeout(() => {
                navigateTo('/admin/admin-dashboard.html');
            }, 600);

        } catch (error) {
            showToast('Authentication Failed', error.message, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });
}

// Load Admin Dashboard
async function loadAdminDashboard() {
    try {
        const stats = await apiRequest('/api/dashboard/admin');

        // Stats Counters
        setElementText('stat-total-users', stats.total_users);
        setElementText('stat-active-users', stats.active_users);
        setElementText('stat-inactive-users', stats.inactive_users);
        setElementText('stat-admin-users', stats.admin_users);
        setElementText('stat-new-users', stats.new_users_month);

        // Recent Users Table
        const recentTable = document.getElementById('recent-users-table-body');
        if (recentTable && stats.recent_users) {
            if (stats.recent_users.length === 0) {
                recentTable.innerHTML = '<tr><td colspan="6" class="text-center py-3 text-muted">No users registered yet.</td></tr>';
            } else {
                recentTable.innerHTML = stats.recent_users.map(u => `
                    <tr>
                        <td>
                            <div class="table-user-cell">
                                ${renderTableAvatar(u)}
                                <div>
                                    <div class="fw-bold">${u.full_name}</div>
                                    <div class="small text-muted">@${u.username}</div>
                                </div>
                            </div>
                        </td>
                        <td>${u.email}</td>
                        <td><span class="badge-status ${u.role.toLowerCase()}">${u.role}</span></td>
                        <td><span class="badge-status ${u.status.toLowerCase()}">${u.status}</span></td>
                        <td>${formatDate(u.created_at)}</td>
                        <td>
                            <a href="user-details.html?id=${u.id}" class="btn btn-sm btn-outline-primary">
                                <i class="fas fa-eye me-1"></i> View
                            </a>
                        </td>
                    </tr>
                `).join('');
            }
        }

        // Render Charts using Chart.js if available
        if (window.Chart) {
            renderStatusChart(stats.status_distribution);
            renderRegistrationChart(stats.monthly_registrations);
        }

    } catch (error) {
        showToast('Error Loading Admin Dashboard', error.message, 'error');
    }
}

// Render Charts
function renderStatusChart(statusDist) {
    const ctx = document.getElementById('statusChart');
    if (!ctx) return;

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Active Users', 'Inactive Users'],
            datasets: [{
                data: [statusDist.ACTIVE || 0, statusDist.INACTIVE || 0],
                backgroundColor: ['#10b981', '#ef4444'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}

function renderRegistrationChart(monthlyData) {
    const ctx = document.getElementById('regChart');
    if (!ctx) return;

    const labels = monthlyData.map(d => d.month);
    const data = monthlyData.map(d => d.count);

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'New Registrations',
                data: data,
                backgroundColor: '#4f46e5',
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 } }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

// User Management Page Logic
function initUsersManagement() {
    // Search input with debounce
    const searchInput = document.getElementById('user-search-input');
    let debounceTimer;
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                currentSearch = searchInput.value.trim();
                currentPage = 1;
                loadAdminUsers();
            }, 350);
        });
    }

    // Role Filter
    const roleFilter = document.getElementById('role-filter');
    if (roleFilter) {
        roleFilter.addEventListener('change', () => {
            currentRole = roleFilter.value;
            currentPage = 1;
            loadAdminUsers();
        });
    }

    // Status Filter
    const statusFilter = document.getElementById('status-filter');
    if (statusFilter) {
        statusFilter.addEventListener('change', () => {
            currentStatus = statusFilter.value;
            currentPage = 1;
            loadAdminUsers();
        });
    }

    // Sort Selector
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
        sortSelect.addEventListener('change', () => {
            const [field, order] = sortSelect.value.split(':');
            currentSort = field;
            currentSortOrder = order || 'desc';
            loadAdminUsers();
        });
    }

    // Edit User Modal Form
    const editUserForm = document.getElementById('admin-edit-user-form');
    if (editUserForm) {
        editUserForm.addEventListener('submit', handleAdminSaveUser);
    }

    // Delete Confirmation Button
    const confirmDeleteBtn = document.getElementById('confirm-delete-user-btn');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', handleAdminDeleteUser);
    }
}

// Fetch and Render Users Table
async function loadAdminUsers() {
    const tableBody = document.getElementById('admin-users-table-body');
    if (!tableBody) return;

    try {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-4">
                    <div class="spinner-border text-primary" role="status"></div>
                    <div class="mt-2 text-muted small">Loading registered users...</div>
                </td>
            </tr>
        `;

        let endpoint = `/api/admin/users?page=${currentPage}&per_page=${perPage}&sort_by=${currentSort}&sort_order=${currentSortOrder}`;
        if (currentSearch) endpoint += `&search=${encodeURIComponent(currentSearch)}`;
        if (currentRole) endpoint += `&role=${encodeURIComponent(currentRole)}`;
        if (currentStatus) endpoint += `&status=${encodeURIComponent(currentStatus)}`;

        const data = await apiRequest(endpoint);

        if (data.users.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center py-5 text-muted">
                        <i class="fas fa-users-slash fa-2x mb-2 d-block"></i>
                        No users found matching your search and filter criteria.
                    </td>
                </tr>
            `;
            updatePaginationControls(0, 0, 0);
            return;
        }

        tableBody.innerHTML = data.users.map(u => `
            <tr>
                <td><strong>#${u.id}</strong></td>
                <td>
                    <div class="table-user-cell">
                        ${renderTableAvatar(u)}
                        <div>
                            <div class="fw-bold">${u.full_name}</div>
                            <div class="small text-muted">@${u.username}</div>
                        </div>
                    </div>
                </td>
                <td>${u.email}</td>
                <td>${u.phone || '<span class="text-muted">—</span>'}</td>
                <td><span class="badge-status ${u.role.toLowerCase()}">${u.role}</span></td>
                <td><span class="badge-status ${u.status.toLowerCase()}">${u.status}</span></td>
                <td>${formatDate(u.created_at)}</td>
                <td>
                    <div class="table-actions">
                        <a href="user-details.html?id=${u.id}" class="btn-icon view-btn" title="View Full Details">
                            <i class="fas fa-eye"></i>
                        </a>
                        <button onclick="openAdminEditModal(${u.id})" class="btn-icon edit-btn" title="Edit User">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="toggleUserStatus(${u.id}, '${u.status}')" class="btn-icon toggle-btn" title="${u.status === 'ACTIVE' ? 'Deactivate User' : 'Activate User'}">
                            <i class="fas ${u.status === 'ACTIVE' ? 'fa-user-slash' : 'fa-user-check'}"></i>
                        </button>
                        <button onclick="openAdminDeleteModal(${u.id}, '${u.username}')" class="btn-icon delete-btn" title="Delete User">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        updatePaginationControls(data.total, data.page, data.total_pages);

    } catch (error) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-4 text-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i> ${error.message}
                </td>
            </tr>
        `;
    }
}

// Pagination Controls
function updatePaginationControls(total, page, totalPages) {
    const info = document.getElementById('pagination-info');
    const nav = document.getElementById('pagination-nav');
    if (!info || !nav) return;

    if (total === 0) {
        info.textContent = 'Showing 0 users';
        nav.innerHTML = '';
        return;
    }

    const start = (page - 1) * perPage + 1;
    const end = Math.min(page * perPage, total);
    info.textContent = `Showing ${start} to ${end} of ${total} users`;

    let html = `
        <button class="page-btn" onclick="changeAdminPage(${page - 1})" ${page <= 1 ? 'disabled' : ''}>
            <i class="fas fa-chevron-left"></i>
        </button>
    `;

    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= page - 2 && i <= page + 2)) {
            html += `<button class="page-btn ${i === page ? 'active' : ''}" onclick="changeAdminPage(${i})">${i}</button>`;
        } else if (i === page - 3 || i === page + 3) {
            html += `<span class="px-2 text-muted">...</span>`;
        }
    }

    html += `
        <button class="page-btn" onclick="changeAdminPage(${page + 1})" ${page >= totalPages ? 'disabled' : ''}>
            <i class="fas fa-chevron-right"></i>
        </button>
    `;

    nav.innerHTML = html;
}

function changeAdminPage(newPage) {
    currentPage = newPage;
    loadAdminUsers();
}

// Toggle User Status
async function toggleUserStatus(userId, currentStatusVal) {
    const newStatus = currentStatusVal === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const actionWord = newStatus === 'ACTIVE' ? 'activate' : 'deactivate';

    if (!confirm(`Are you sure you want to ${actionWord} this user account?`)) {
        return;
    }

    try {
        await apiRequest(`/api/admin/users/${userId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status: newStatus })
        });

        showToast('Status Updated', `User account marked as ${newStatus}.`, 'success');
        await loadAdminUsers();
    } catch (error) {
        showToast('Error', error.message, 'error');
    }
}

// Open Edit Modal
async function openAdminEditModal(userId) {
    editTargetUserId = userId;
    try {
        const user = await apiRequest(`/api/admin/users/${userId}`);

        setInputValue('admin_edit_fullname', user.full_name);
        setInputValue('admin_edit_username', user.username);
        setInputValue('admin_edit_email', user.email);
        setInputValue('admin_edit_phone', user.phone || '');
        setInputValue('admin_edit_city', user.city || '');
        setInputValue('admin_edit_country', user.country || '');
        setInputValue('admin_edit_role', user.role);
        setInputValue('admin_edit_status', user.status);

        const modalEl = document.getElementById('adminEditUserModal');
        if (modalEl && window.bootstrap) {
            const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
            modal.show();
        }
    } catch (error) {
        showToast('Error', error.message, 'error');
    }
}

// Save User Admin Edits
async function handleAdminSaveUser(e) {
    e.preventDefault();
    if (!editTargetUserId) return;

    const saveBtn = e.target.querySelector('button[type="submit"]');
    const origText = saveBtn.innerHTML;

    const payload = {
        full_name: document.getElementById('admin_edit_fullname').value.trim(),
        username: document.getElementById('admin_edit_username').value.trim(),
        email: document.getElementById('admin_edit_email').value.trim(),
        phone: document.getElementById('admin_edit_phone').value.trim() || null,
        city: document.getElementById('admin_edit_city').value.trim() || null,
        country: document.getElementById('admin_edit_country').value.trim() || null,
        role: document.getElementById('admin_edit_role').value,
        status: document.getElementById('admin_edit_status').value
    };

    try {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';

        await apiRequest(`/api/admin/users/${editTargetUserId}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
        });

        showToast('User Updated', 'User record updated successfully.', 'success');

        const modalEl = document.getElementById('adminEditUserModal');
        if (modalEl && window.bootstrap) {
            const modal = bootstrap.Modal.getInstance(modalEl);
            modal.hide();
        }

        await loadAdminUsers();
    } catch (error) {
        showToast('Update Failed', error.message, 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = origText;
    }
}

// Open Delete Modal
function openAdminDeleteModal(userId, username) {
    deleteTargetUserId = userId;
    const userLabel = document.getElementById('delete-target-username');
    if (userLabel) userLabel.textContent = `@${username} (ID: #${userId})`;

    const modalEl = document.getElementById('adminDeleteUserModal');
    if (modalEl && window.bootstrap) {
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();
    }
}

// Confirm Admin Delete User
async function handleAdminDeleteUser() {
    if (!deleteTargetUserId) return;
    const btn = document.getElementById('confirm-delete-user-btn');
    const origText = btn.innerHTML;

    try {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Deleting...';

        const res = await apiRequest(`/api/admin/users/${deleteTargetUserId}`, {
            method: 'DELETE'
        });

        showToast('User Deleted', res.message, 'success');

        const modalEl = document.getElementById('adminDeleteUserModal');
        if (modalEl && window.bootstrap) {
            const modal = bootstrap.Modal.getInstance(modalEl);
            modal.hide();
        }

        deleteTargetUserId = null;
        await loadAdminUsers();
    } catch (error) {
        showToast('Deletion Failed', error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = origText;
    }
}

// Admin User Details Page
async function loadAdminUserDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('id');

    if (!userId) {
        showToast('Missing User ID', 'No user specified.', 'warning');
        setTimeout(() => { navigateTo('/admin/users.html'); }, 1000);
        return;
    }

    try {
        const user = await apiRequest(`/api/admin/users/${userId}`);

        setElementText('detail-full-name', user.full_name);
        setElementText('detail-username', user.username);
        setElementText('detail-email', user.email);
        setElementText('detail-phone', user.phone || 'Not provided');
        setElementText('detail-dob', user.date_of_birth ? formatDate(user.date_of_birth) : 'Not provided');
        setElementText('detail-gender', user.gender || 'Not specified');
        setElementText('detail-address', user.address || 'Not provided');
        setElementText('detail-city', user.city || 'Not provided');
        setElementText('detail-state', user.state || 'Not provided');
        setElementText('detail-country', user.country || 'Not provided');
        setElementText('detail-postal', user.postal_code || 'Not provided');
        setElementText('detail-created', formatDate(user.created_at, true));
        setElementText('detail-updated', formatDate(user.updated_at, true));
        setElementText('detail-last-login', formatDate(user.last_login, true));

        const roleBadge = document.getElementById('detail-role-badge');
        if (roleBadge) roleBadge.innerHTML = `<span class="badge-status ${user.role.toLowerCase()}">${user.role}</span>`;

        const statusBadge = document.getElementById('detail-status-badge');
        if (statusBadge) statusBadge.innerHTML = `<span class="badge-status ${user.status.toLowerCase()}">${user.status}</span>`;

        // Avatar
        const avatarImg = document.getElementById('detail-avatar-img');
        const avatarInitial = document.getElementById('detail-avatar-initial');
        const avatarUrl = getAvatarUrl(user.profile_picture);
        if (avatarUrl) {
            if (avatarImg) { avatarImg.src = avatarUrl; avatarImg.style.display = 'block'; }
            if (avatarInitial) avatarInitial.style.display = 'none';
        } else {
            if (avatarInitial) { avatarInitial.textContent = user.full_name.charAt(0).toUpperCase(); avatarInitial.style.display = 'flex'; }
            if (avatarImg) avatarImg.style.display = 'none';
        }

        // Action Buttons
        const editBtn = document.getElementById('detail-edit-btn');
        if (editBtn) editBtn.onclick = () => openAdminEditModal(user.id);

        const toggleBtn = document.getElementById('detail-toggle-status-btn');
        if (toggleBtn) {
            toggleBtn.innerHTML = user.status === 'ACTIVE' 
                ? '<i class="fas fa-user-slash me-1"></i> Deactivate Account'
                : '<i class="fas fa-user-check me-1"></i> Activate Account';
            toggleBtn.className = `btn btn-${user.status === 'ACTIVE' ? 'warning' : 'success'}`;
            toggleBtn.onclick = async () => {
                await toggleUserStatus(user.id, user.status);
                loadAdminUserDetails();
            };
        }

        const deleteBtn = document.getElementById('detail-delete-btn');
        if (deleteBtn) {
            deleteBtn.onclick = () => {
                if (confirm(`Are you sure you want to permanently delete user @${user.username}?`)) {
                    apiRequest(`/api/admin/users/${user.id}`, { method: 'DELETE' })
                        .then(() => {
                            showToast('User Deleted', 'User was removed successfully.', 'success');
                            setTimeout(() => { navigateTo('/admin/users.html'); }, 1000);
                        })
                        .catch(err => showToast('Error', err.message, 'error'));
                }
            };
        }

    } catch (error) {
        showToast('Error', error.message, 'error');
    }
}

function renderTableAvatar(user) {
    const avatarUrl = getAvatarUrl(user.profile_picture);
    if (avatarUrl) {
        return `<img src="${avatarUrl}" class="table-avatar" alt="${user.full_name}">`;
    }
    return `<div class="table-avatar">${user.full_name.charAt(0).toUpperCase()}</div>`;
}

function setElementText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function setInputValue(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val || '';
}
