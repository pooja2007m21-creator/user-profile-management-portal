/**
 * User Profile Management Portal - User Dashboard
 */

document.addEventListener('DOMContentLoaded', async () => {
    // Check user authentication
    if (!requireAuth()) return;

    // Sidebar Mobile Toggle
    initSidebarToggle();

    // Load User Dashboard Data
    await loadUserDashboard();
});

function initSidebarToggle() {
    const toggleBtn = document.getElementById('sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('show');
        });
    }

    // Close on outside click on mobile
    document.addEventListener('click', (e) => {
        if (sidebar && sidebar.classList.contains('show')) {
            if (!sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
                sidebar.classList.remove('show');
            }
        }
    });
}

async function loadUserDashboard() {
    try {
        const data = await apiRequest('/api/dashboard/user');
        const user = data.user;
        const completion = data.completion;

        // Update Stored User
        setStoredUser(user);

        // Header / Greeting Info
        const welcomeName = document.getElementById('user-welcome-name');
        if (welcomeName) welcomeName.textContent = user.full_name;

        // Mini Sidebar Info
        const sidebarName = document.getElementById('sidebar-user-name');
        const sidebarRole = document.getElementById('sidebar-user-role');
        const sidebarAvatar = document.getElementById('sidebar-avatar-img');
        const sidebarInitial = document.getElementById('sidebar-avatar-initial');

        if (sidebarName) sidebarName.textContent = user.full_name;
        if (sidebarRole) sidebarRole.textContent = `${user.role} Account`;

        // User Avatar Handling
        const avatarUrl = getAvatarUrl(user.profile_picture);
        if (avatarUrl) {
            if (sidebarAvatar) {
                sidebarAvatar.src = avatarUrl;
                sidebarAvatar.style.display = 'block';
            }
            if (sidebarInitial) sidebarInitial.style.display = 'none';

            const dashAvatar = document.getElementById('dash-avatar-img');
            const dashInitial = document.getElementById('dash-avatar-initial');
            if (dashAvatar) {
                dashAvatar.src = avatarUrl;
                dashAvatar.style.display = 'block';
            }
            if (dashInitial) dashInitial.style.display = 'none';
        } else {
            const initial = user.full_name.charAt(0).toUpperCase();
            if (sidebarInitial) {
                sidebarInitial.textContent = initial;
                sidebarInitial.style.display = 'flex';
            }
            if (sidebarAvatar) sidebarAvatar.style.display = 'none';

            const dashInitial = document.getElementById('dash-avatar-initial');
            if (dashInitial) {
                dashInitial.textContent = initial;
                dashInitial.style.display = 'flex';
            }
        }

        // Stats Cards
        const statCompletion = document.getElementById('stat-completion-val');
        const statStatus = document.getElementById('stat-status-val');
        const statUpdated = document.getElementById('stat-updated-val');
        const statSecurity = document.getElementById('stat-security-val');
        const statLastLogin = document.getElementById('stat-last-login-val');

        if (statCompletion) statCompletion.textContent = `${completion.percentage}%`;
        if (statStatus) {
            statStatus.innerHTML = `<span class="badge-status ${user.status.toLowerCase()}">${user.status}</span>`;
        }
        if (statUpdated) statUpdated.textContent = formatDate(user.updated_at);
        if (statSecurity) statSecurity.textContent = data.security_status;
        if (statLastLogin) statLastLogin.textContent = formatDate(user.last_login, true);

        // Profile Completion Progress Bar & Suggestions
        const progressFill = document.getElementById('completion-progress-fill');
        const progressPercent = document.getElementById('completion-percent-badge');
        const tipsContainer = document.getElementById('completion-tips-container');

        if (progressFill) progressFill.style.width = `${completion.percentage}%`;
        if (progressPercent) progressPercent.textContent = `${completion.percentage}% Completed`;

        if (tipsContainer) {
            if (completion.suggestions && completion.suggestions.length > 0) {
                tipsContainer.innerHTML = completion.suggestions.slice(0, 3).map(tip => `
                    <div class="completion-tip-item">
                        <i class="fas fa-lightbulb text-warning"></i>
                        <span>${tip}</span>
                    </div>
                `).join('');
            } else {
                tipsContainer.innerHTML = `
                    <div class="completion-tip-item">
                        <i class="fas fa-check-circle text-success"></i>
                        <span>Congratulations! Your profile is 100% complete and fully verified.</span>
                    </div>
                `;
            }
        }

        // User Overview Summary
        const dashEmail = document.getElementById('dash-user-email');
        const dashUsername = document.getElementById('dash-user-username');
        const dashPhone = document.getElementById('dash-user-phone');
        const dashLocation = document.getElementById('dash-user-location');

        if (dashEmail) dashEmail.textContent = user.email;
        if (dashUsername) dashUsername.textContent = `@${user.username}`;
        if (dashPhone) dashPhone.textContent = user.phone || 'Not specified';
        
        const locParts = [user.city, user.country].filter(Boolean).join(', ');
        if (dashLocation) dashLocation.textContent = locParts || 'Location not set';

    } catch (error) {
        showToast('Error Loading Dashboard', error.message, 'error');
    }
}
