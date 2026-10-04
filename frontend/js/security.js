/**
 * User Profile Management Portal - Security & Password Change
 */

document.addEventListener('DOMContentLoaded', async () => {
    if (!requireAuth()) return;

    // Sidebar Mobile Toggle
    const toggleBtn = document.getElementById('sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', () => sidebar.classList.toggle('show'));
    }

    // Populate sidebar info from stored user
    const user = getStoredUser();
    if (user) {
        const sidebarName = document.getElementById('sidebar-user-name');
        const sidebarRole = document.getElementById('sidebar-user-role');
        const sidebarAvatar = document.getElementById('sidebar-avatar-img');
        const sidebarInitial = document.getElementById('sidebar-avatar-initial');

        if (sidebarName) sidebarName.textContent = user.full_name;
        if (sidebarRole) sidebarRole.textContent = `${user.role} Account`;

        const avatarUrl = getAvatarUrl(user.profile_picture);
        if (avatarUrl) {
            if (sidebarAvatar) {
                sidebarAvatar.src = avatarUrl;
                sidebarAvatar.style.display = 'block';
            }
            if (sidebarInitial) sidebarInitial.style.display = 'none';
        } else {
            if (sidebarInitial) {
                sidebarInitial.textContent = user.full_name.charAt(0).toUpperCase();
                sidebarInitial.style.display = 'flex';
            }
            if (sidebarAvatar) sidebarAvatar.style.display = 'none';
        }
    }

    // Password Form Handlers
    initPasswordToggles();
    initPasswordStrengthChecker();

    const changePasswordForm = document.getElementById('change-password-form');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = changePasswordForm.querySelector('button[type="submit"]');
            const origText = submitBtn.innerHTML;

            const currentPassword = document.getElementById('current_password').value;
            const newPassword = document.getElementById('new_password').value;
            const confirmNewPassword = document.getElementById('confirm_new_password').value;

            if (newPassword !== confirmNewPassword) {
                showToast('Password Mismatch', 'New password and confirmation password do not match.', 'error');
                return;
            }

            const strength = evaluatePassword(newPassword);
            if (strength.score < 5) {
                showToast('Weak Password', 'Please ensure your new password satisfies all requirements.', 'warning');
                return;
            }

            try {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Updating Password...';

                const response = await apiRequest('/api/security/change-password', {
                    method: 'PUT',
                    body: JSON.stringify({
                        current_password: currentPassword,
                        new_password: newPassword,
                        confirm_new_password: confirmNewPassword
                    })
                });

                showToast('Success!', response.message, 'success');
                changePasswordForm.reset();

                // Reset password meters
                const strengthBar = document.getElementById('strength-bar');
                const strengthLabel = document.getElementById('strength-label');
                if (strengthBar) strengthBar.style.width = '0%';
                if (strengthLabel) {
                    strengthLabel.textContent = 'Password Strength';
                    strengthLabel.style.color = 'var(--gray-500)';
                }

                // Reset requirement checkmarks
                document.querySelectorAll('.requirement-item').forEach(item => {
                    item.classList.remove('valid');
                    const icon = item.querySelector('i');
                    if (icon) icon.className = 'far fa-circle';
                });

            } catch (error) {
                showToast('Password Change Failed', error.message, 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = origText;
            }
        });
    }
});
