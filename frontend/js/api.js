/**
 * User Profile Management Portal - Central API Client & UI Utilities
 */

// Dynamically determine Backend Base URL
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? (window.location.port === '8000' ? '' : 'http://127.0.0.1:8000')
    : '';

const TOKEN_KEY = 'portal_auth_token';
const USER_KEY = 'portal_auth_user';

function getAppRoot() {
    return window.location.pathname.includes('/frontend/') ? '/frontend' : '';
}

function navigateTo(path) {
    const root = getAppRoot();
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    window.location.href = `${root}${cleanPath}`;
}

// Token Management
function getAuthToken() {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
}

function setAuthToken(token, rememberMe = false) {
    if (rememberMe) {
        localStorage.setItem(TOKEN_KEY, token);
    } else {
        sessionStorage.setItem(TOKEN_KEY, token);
    }
}

function removeAuthToken() {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
}

// Stored User Info Management
function getStoredUser() {
    const raw = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
    try {
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        return null;
    }
}

function setStoredUser(user, rememberMe = false) {
    const str = JSON.stringify(user);
    if (rememberMe || localStorage.getItem(TOKEN_KEY)) {
        localStorage.setItem(USER_KEY, str);
    } else {
        sessionStorage.setItem(USER_KEY, str);
    }
}

function removeStoredUser() {
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(USER_KEY);
}

// Toast Notification Manager
function showToast(title, message, type = 'info', duration = 4000) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const iconMap = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-triangle',
        warning: 'fa-exclamation-circle',
        info: 'fa-info-circle'
    };

    const toast = document.createElement('div');
    toast.className = `portal-toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-icon">
            <i class="fas ${iconMap[type] || iconMap.info}"></i>
        </div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// Central API Request Wrapper
async function apiRequest(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
    const token = getAuthToken();

    const headers = options.headers || {};
    
    // Add auth token if available
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    // Set JSON content-type only if not multipart form data
    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }

    const config = {
        ...options,
        headers: headers
    };

    try {
        const response = await fetch(url, config);
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            // Handle unauthenticated state
            if (response.status === 401) {
                removeAuthToken();
                removeStoredUser();
                
                const isAuthPage = window.location.pathname.includes('login') || window.location.pathname.includes('register');
                if (!isAuthPage) {
                    showToast('Session Expired', 'Please log in to continue.', 'warning');
                    setTimeout(() => {
                        const isAdminPage = window.location.pathname.includes('/admin/');
                        navigateTo(isAdminPage ? '/admin/admin-login.html' : '/login.html');
                    }, 1200);
                }
            }

            const errorDetail = data.detail || (Array.isArray(data) ? data[0]?.msg : 'Request failed. Please try again.');
            throw new Error(errorDetail);
        }

        return data;
    } catch (error) {
        throw error;
    }
}

// Route Authentication Guard
function requireAuth(requiredRole = null) {
    const token = getAuthToken();
    const user = getStoredUser();

    if (!token || !user) {
        const isAdminPage = window.location.pathname.includes('/admin/');
        navigateTo(isAdminPage ? '/admin/admin-login.html' : '/login.html');
        return false;
    }

    if (requiredRole && user.role !== requiredRole) {
        if (requiredRole === 'ADMIN') {
            showToast('Access Denied', 'Administrator access required.', 'error');
            setTimeout(() => { navigateTo('/admin/admin-login.html'); }, 1000);
            return false;
        }
    }

    return true;
}

// Redirect logged in user away from public login/register
function redirectIfLoggedIn() {
    const token = getAuthToken();
    const user = getStoredUser();
    if (token && user) {
        if (user.role === 'ADMIN' && window.location.pathname.includes('/admin/')) {
            navigateTo('/admin/admin-dashboard.html');
        } else {
            navigateTo('/dashboard.html');
        }
    }
}

// Format Dates
function formatDate(dateStr, includeTime = false) {
    if (!dateStr) return 'Never';
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        if (includeTime) {
            options.hour = '2-digit';
            options.minute = '2-digit';
        }
        return date.toLocaleDateString(undefined, options);
    } catch (e) {
        return dateStr;
    }
}

// Profile Avatar Render Helper
function getAvatarUrl(profilePicPath) {
    if (!profilePicPath) return null;
    if (profilePicPath.startsWith('http')) return profilePicPath;
    return `${API_BASE_URL}${profilePicPath}`;
}

// Logout Utility
async function handleLogout(isAdmin = false) {
    try {
        await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch (e) {
        // Continue logout even if API call fails
    } finally {
        removeAuthToken();
        removeStoredUser();
        showToast('Logged Out', 'You have been logged out successfully.', 'info');
        setTimeout(() => {
            navigateTo(isAdmin ? '/admin/admin-login.html' : '/login.html');
        }, 600);
    }
}
