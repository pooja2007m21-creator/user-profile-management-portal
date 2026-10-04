/**
 * User Profile Management Portal - Account Settings & Deletion
 */

document.addEventListener('DOMContentLoaded', async () => {
    if (!requireAuth()) return;

    // Sidebar Mobile Toggle
    const toggleBtn = document.getElementById('sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', () => sidebar.classList.toggle('show'));
    }

    const user = getStoredUser();
    if (user) {
        updateSidebarUser(user);

        const emailInput = document.getElementById('settings_email');
        if (emailInput) emailInput.value = user.email;

        const currentStatusSpan = document.getElementById('settings-current-status');
        if (currentStatusSpan) {
            currentStatusSpan.innerHTML = `<span class="badge-status ${user.status.toLowerCase()}">${user.status}</span>`;
        }
    }

    // Email Update Form
    const emailForm = document.getElementById('settings-email-form');
    if (emailForm) {
        emailForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = emailForm.querySelector('button[type="submit"]');
            const orig = btn.innerHTML;
            const newEmail = document.getElementById('settings_email').value.trim();

            try {
                btn.disabled = true;
                btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Updating...';

                const res = await apiRequest('/api/profile', {
                    method: 'PUT',
                    body: JSON.stringify({ email: newEmail })
                });

                setStoredUser(res.user);
                showToast('Email Updated', 'Your email address has been updated successfully.', 'success');
            } catch (error) {
                showToast('Update Failed', error.message, 'error');
            } finally {
                btn.disabled = false;
                btn.innerHTML = orig;
            }
        });
    }

    // Notification Preferences Form
    const notifyForm = document.getElementById('notifications-form');
    if (notifyForm) {
        notifyForm.addEventListener('submit', (e) => {
            e.preventDefault();
            showToast('Preferences Saved', 'Notification settings have been saved.', 'success');
        });
    }

    // Account Deletion Confirmation
    const deleteAccountBtn = document.getElementById('confirm-delete-account-btn');
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', async () => {
            const confirmInput = document.getElementById('delete_confirmation_text').value.trim();
            if (confirmInput.toUpperCase() !== 'DELETE') {
                showToast('Confirmation Mismatch', 'Please type DELETE in capital letters to confirm.', 'error');
                return;
            }

            try {
                deleteAccountBtn.disabled = true;
                deleteAccountBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Deleting...';

                await apiRequest('/api/users/me', {
                    method: 'DELETE'
                });

                removeAuthToken();
                removeStoredUser();
                showToast('Account Deleted', 'Your account has been permanently removed.', 'info');

                setTimeout(() => {
                    window.location.href = '/index.html';
                }, 1500);

            } catch (error) {
                showToast('Deletion Failed', error.message, 'error');
                deleteAccountBtn.disabled = false;
                deleteAccountBtn.innerHTML = 'Yes, Delete My Account';
            }
        });
    }
});
