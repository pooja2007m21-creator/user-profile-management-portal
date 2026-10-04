/**
 * User Profile Management Portal - Profile View, Edit & Photo Management
 */

document.addEventListener('DOMContentLoaded', async () => {
    if (!requireAuth()) return;

    // Sidebar Mobile Toggle
    initSidebarToggle();

    // Check if on Profile View or Edit Profile page
    const isEditPage = document.getElementById('edit-profile-form') !== null;
    if (isEditPage) {
        await initEditProfilePage();
    } else {
        await initViewProfilePage();
    }
});

function initSidebarToggle() {
    const toggleBtn = document.getElementById('sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('show');
        });
    }
}

// 1. View Profile Page
async function initViewProfilePage() {
    try {
        const data = await apiRequest('/api/profile');
        const user = data.user;
        const completion = data.completion;

        // Populate Sidebar mini
        updateSidebarUser(user);

        // Header Avatar and Name
        const profileAvatarImg = document.getElementById('profile-avatar-img');
        const profileAvatarInitial = document.getElementById('profile-avatar-initial');
        const profileName = document.getElementById('profile-name');
        const profileRole = document.getElementById('profile-role');
        const profileStatusBadge = document.getElementById('profile-status-badge');

        if (profileName) profileName.textContent = user.full_name;
        if (profileRole) profileRole.textContent = `@${user.username} (${user.role})`;
        if (profileStatusBadge) {
            profileStatusBadge.innerHTML = `<span class="badge-status ${user.status.toLowerCase()}">${user.status}</span>`;
        }

        const avatarUrl = getAvatarUrl(user.profile_picture);
        if (avatarUrl) {
            if (profileAvatarImg) {
                profileAvatarImg.src = avatarUrl;
                profileAvatarImg.style.display = 'block';
            }
            if (profileAvatarInitial) profileAvatarInitial.style.display = 'none';
        } else {
            if (profileAvatarInitial) {
                profileAvatarInitial.textContent = user.full_name.charAt(0).toUpperCase();
                profileAvatarInitial.style.display = 'flex';
            }
            if (profileAvatarImg) profileAvatarImg.style.display = 'none';
        }

        // Personal Information
        setElementText('view-full-name', user.full_name);
        setElementText('view-username', user.username);
        setElementText('view-email', user.email);
        setElementText('view-phone', user.phone || 'Not provided');
        setElementText('view-dob', user.date_of_birth ? formatDate(user.date_of_birth) : 'Not provided');
        setElementText('view-gender', user.gender || 'Not specified');

        // Address Information
        setElementText('view-address', user.address || 'Not provided');
        setElementText('view-city', user.city || 'Not provided');
        setElementText('view-state', user.state || 'Not provided');
        setElementText('view-country', user.country || 'Not provided');
        setElementText('view-postal-code', user.postal_code || 'Not provided');

        // Account Metadata
        setElementText('view-created-at', formatDate(user.created_at, true));
        setElementText('view-updated-at', formatDate(user.updated_at, true));
        setElementText('view-last-login', formatDate(user.last_login, true));
        setElementText('view-role', user.role);

        // Completion Progress
        const completionBar = document.getElementById('profile-completion-bar');
        const completionText = document.getElementById('profile-completion-text');
        if (completionBar) completionBar.style.width = `${completion.percentage}%`;
        if (completionText) completionText.textContent = `${completion.percentage}% Completed`;

    } catch (error) {
        showToast('Error Loading Profile', error.message, 'error');
    }
}

// 2. Edit Profile Page
async function initEditProfilePage() {
    try {
        const data = await apiRequest('/api/profile');
        const user = data.user;
        updateSidebarUser(user);

        // Pre-fill form fields
        setInputValue('edit_full_name', user.full_name);
        setInputValue('edit_username', user.username);
        setInputValue('edit_email', user.email);
        setInputValue('edit_phone', user.phone || '');
        setInputValue('edit_dob', user.date_of_birth || '');
        setInputValue('edit_gender', user.gender || '');
        setInputValue('edit_address', user.address || '');
        setInputValue('edit_city', user.city || '');
        setInputValue('edit_state', user.state || '');
        setInputValue('edit_country', user.country || '');
        setInputValue('edit_postal_code', user.postal_code || '');

        // Pre-fill avatar
        const previewImg = document.getElementById('edit-avatar-preview');
        const placeholderIcon = document.getElementById('edit-avatar-placeholder');
        const avatarUrl = getAvatarUrl(user.profile_picture);

        if (avatarUrl) {
            if (previewImg) {
                previewImg.src = avatarUrl;
                previewImg.style.display = 'block';
            }
            if (placeholderIcon) placeholderIcon.style.display = 'none';
        }

        // Handle Photo Selection & Upload
        const photoInput = document.getElementById('photo_upload_input');
        if (photoInput) {
            photoInput.addEventListener('change', async () => {
                const file = photoInput.files[0];
                if (!file) return;

                if (file.size > 5 * 1024 * 1024) {
                    showToast('File Too Large', 'Maximum image size is 5MB.', 'warning');
                    photoInput.value = '';
                    return;
                }

                // Instant UI preview
                const reader = new FileReader();
                reader.onload = (e) => {
                    if (previewImg) {
                        previewImg.src = e.target.result;
                        previewImg.style.display = 'block';
                    }
                    if (placeholderIcon) placeholderIcon.style.display = 'none';
                };
                reader.readAsDataURL(file);

                // Auto upload photo immediately to server
                try {
                    showToast('Uploading Photo', 'Saving your profile picture...', 'info');
                    const formData = new FormData();
                    formData.append('file', file);

                    const photoRes = await apiRequest('/api/profile/photo', {
                        method: 'POST',
                        body: formData
                    });

                    showToast('Profile Picture Updated', photoRes.message, 'success');
                } catch (err) {
                    showToast('Upload Failed', err.message, 'error');
                }
            });
        }

        // Handle Edit Profile Form Submission
        const editForm = document.getElementById('edit-profile-form');
        if (editForm) {
            editForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const saveBtn = editForm.querySelector('button[type="submit"]');
                const origText = saveBtn.innerHTML;

                const payload = {
                    full_name: document.getElementById('edit_full_name').value.trim(),
                    email: document.getElementById('edit_email').value.trim(),
                    phone: document.getElementById('edit_phone').value.trim() || null,
                    date_of_birth: document.getElementById('edit_dob').value || null,
                    gender: document.getElementById('edit_gender').value || null,
                    address: document.getElementById('edit_address').value.trim() || null,
                    city: document.getElementById('edit_city').value.trim() || null,
                    state: document.getElementById('edit_state').value.trim() || null,
                    country: document.getElementById('edit_country').value.trim() || null,
                    postal_code: document.getElementById('edit_postal_code').value.trim() || null,
                };

                try {
                    saveBtn.disabled = true;
                    saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving Changes...';

                    const res = await apiRequest('/api/profile', {
                        method: 'PUT',
                        body: JSON.stringify(payload)
                    });

                    setStoredUser(res.user);
                    showToast('Profile Updated', 'Profile updated successfully.', 'success');
                    
                    setTimeout(() => {
                        window.location.href = '/profile.html';
                    }, 1000);

                } catch (error) {
                    showToast('Update Failed', error.message, 'error');
                } finally {
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = origText;
                }
            });
        }

    } catch (error) {
        showToast('Error', error.message, 'error');
    }
}

function updateSidebarUser(user) {
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

function setElementText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function setInputValue(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val || '';
}
