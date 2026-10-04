/**
 * User Profile Management Portal - Authentication & Password Handling
 */

document.addEventListener('DOMContentLoaded', () => {
    initPasswordToggles();
    initPasswordStrengthChecker();
    initAvatarPreview();
    initAuthForms();
});

// Toggle Password Visibility
function initPasswordToggles() {
    const toggleButtons = document.querySelectorAll('.password-toggle-btn');
    toggleButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const input = document.getElementById(targetId);
            if (input) {
                const isPassword = input.getAttribute('type') === 'password';
                input.setAttribute('type', isPassword ? 'text' : 'password');
                const icon = btn.querySelector('i');
                if (icon) {
                    icon.className = isPassword ? 'fas fa-eye-slash' : 'fas fa-eye';
                }
            }
        });
    });
}

// Password Strength Evaluation & Requirements Checklist
function evaluatePassword(password) {
    const results = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /\d/.test(password),
        special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
        score: 0
    };

    let count = 0;
    if (results.length) count++;
    if (results.uppercase) count++;
    if (results.lowercase) count++;
    if (results.number) count++;
    if (results.special) count++;

    results.score = count;
    return results;
}

function initPasswordStrengthChecker() {
    const passwordInput = document.getElementById('password') || document.getElementById('new_password');
    if (!passwordInput) return;

    const strengthBar = document.getElementById('strength-bar');
    const strengthLabel = document.getElementById('strength-label');
    const reqLength = document.getElementById('req-length');
    const reqUpper = document.getElementById('req-upper');
    const reqLower = document.getElementById('req-lower');
    const reqNum = document.getElementById('req-num');
    const reqSpecial = document.getElementById('req-special');

    passwordInput.addEventListener('input', () => {
        const val = passwordInput.value;
        const result = evaluatePassword(val);

        // Update Requirement Checkmarks
        if (reqLength) updateRequirement(reqLength, result.length);
        if (reqUpper) updateRequirement(reqUpper, result.uppercase);
        if (reqLower) updateRequirement(reqLower, result.lowercase);
        if (reqNum) updateRequirement(reqNum, result.number);
        if (reqSpecial) updateRequirement(reqSpecial, result.special);

        // Update Strength Meter Bar
        if (strengthBar && strengthLabel) {
            strengthBar.className = 'strength-bar';
            if (val.length === 0) {
                strengthBar.style.width = '0%';
                strengthLabel.textContent = 'Password Strength';
                strengthLabel.style.color = 'var(--gray-500)';
            } else if (result.score <= 2) {
                strengthBar.classList.add('weak');
                strengthLabel.textContent = 'Weak Password';
                strengthLabel.style.color = 'var(--danger)';
            } else if (result.score <= 4) {
                strengthBar.classList.add('medium');
                strengthLabel.textContent = 'Moderate Password';
                strengthLabel.style.color = 'var(--warning)';
            } else {
                strengthBar.classList.add('strong');
                strengthLabel.textContent = 'Strong Password';
                strengthLabel.style.color = 'var(--success)';
            }
        }
    });
}

function updateRequirement(element, isValid) {
    if (isValid) {
        element.classList.add('valid');
        const icon = element.querySelector('i');
        if (icon) icon.className = 'fas fa-check-circle';
    } else {
        element.classList.remove('valid');
        const icon = element.querySelector('i');
        if (icon) icon.className = 'far fa-circle';
    }
}

// Avatar File Preview
function initAvatarPreview() {
    const fileInput = document.getElementById('profile_picture_input');
    const previewImg = document.getElementById('avatar-preview-img');
    const placeholder = document.getElementById('avatar-placeholder-icon');

    if (!fileInput) return;

    fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                showToast('File Too Large', 'Maximum image size is 5MB.', 'warning');
                fileInput.value = '';
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                if (previewImg) {
                    previewImg.src = e.target.result;
                    previewImg.style.display = 'block';
                }
                if (placeholder) {
                    placeholder.style.display = 'none';
                }
            };
            reader.readAsDataURL(file);
        }
    });
}

// Initialize Authentication Forms Handlers
function initAuthForms() {
    // 1. User Login Form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;

            const usernameOrEmail = document.getElementById('username_or_email').value.trim();
            const password = document.getElementById('password').value;
            const rememberMe = document.getElementById('remember_me')?.checked || false;

            if (!usernameOrEmail || !password) {
                showToast('Validation Error', 'Please enter your username/email and password.', 'error');
                return;
            }

            try {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Logging in...';

                const response = await apiRequest('/api/auth/login', {
                    method: 'POST',
                    body: JSON.stringify({
                        username_or_email: usernameOrEmail,
                        password: password,
                        remember_me: rememberMe
                    })
                });

                setAuthToken(response.access_token, rememberMe);
                setStoredUser(response.user, rememberMe);

                showToast('Welcome back!', `Logged in as ${response.user.full_name}`, 'success');

                setTimeout(() => {
                    if (response.user.role === 'ADMIN') {
                        navigateTo('/admin/admin-dashboard.html');
                    } else {
                        navigateTo('/dashboard.html');
                    }
                }, 800);

            } catch (error) {
                showToast('Login Failed', error.message, 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        });
    }

    // 2. User Registration Form
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = registerForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;

            const fullName = document.getElementById('full_name').value.trim();
            const username = document.getElementById('username').value.trim();
            const email = document.getElementById('email').value.trim();
            const phone = document.getElementById('phone')?.value.trim() || '';
            const dob = document.getElementById('date_of_birth')?.value || '';
            const gender = document.getElementById('gender')?.value || '';
            const address = document.getElementById('address')?.value.trim() || '';
            const city = document.getElementById('city')?.value.trim() || '';
            const state = document.getElementById('state')?.value.trim() || '';
            const country = document.getElementById('country')?.value.trim() || '';
            const postalCode = document.getElementById('postal_code')?.value.trim() || '';
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm_password').value;
            const photoInput = document.getElementById('profile_picture_input');

            // Client-side Validations
            if (password !== confirmPassword) {
                showToast('Password Mismatch', 'Password and Confirm Password do not match.', 'error');
                return;
            }

            const strength = evaluatePassword(password);
            if (strength.score < 5) {
                showToast('Weak Password', 'Please satisfy all password security requirements.', 'warning');
                return;
            }

            try {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Creating Account...';

                // Use FormData to support optional profile picture
                const formData = new FormData();
                formData.append('full_name', fullName);
                formData.append('username', username);
                formData.append('email', email);
                formData.append('password', password);
                formData.append('confirm_password', confirmPassword);
                if (phone) formData.append('phone', phone);
                if (dob) formData.append('date_of_birth', dob);
                if (gender) formData.append('gender', gender);
                if (address) formData.append('address', address);
                if (city) formData.append('city', city);
                if (state) formData.append('state', state);
                if (country) formData.append('country', country);
                if (postalCode) formData.append('postal_code', postalCode);

                if (photoInput && photoInput.files[0]) {
                    formData.append('profile_picture', photoInput.files[0]);
                }

                await apiRequest('/api/auth/register-with-photo', {
                    method: 'POST',
                    body: formData
                });

                showToast('Registration Successful!', 'Your account has been created. Redirecting to login...', 'success');
                setTimeout(() => {
                    navigateTo('/login.html');
                }, 1500);

            } catch (error) {
                showToast('Registration Failed', error.message, 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        });
    }

    // 3. Forgot Password Form
    const forgotForm = document.getElementById('forgot-password-form');
    if (forgotForm) {
        forgotForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = forgotForm.querySelector('button[type="submit"]');
            const emailInput = document.getElementById('reset_email');
            const resultBox = document.getElementById('reset-token-result');

            try {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Sending...';

                const response = await apiRequest('/api/auth/forgot-password', {
                    method: 'POST',
                    body: JSON.stringify({ email: emailInput.value.trim() })
                });

                showToast('Reset Token Generated', response.message, 'success');

                if (resultBox && response.data) {
                    resultBox.style.display = 'block';
                    resultBox.innerHTML = `
                        <div class="alert alert-success mt-3 mb-0">
                            <strong><i class="fas fa-key me-1"></i> Demo Password Reset Token:</strong>
                            <div class="mt-2 p-2 bg-white rounded border text-break font-monospace small">
                                ${response.data.reset_token}
                            </div>
                            <div class="mt-2">
                                <a href="${response.data.reset_url}" class="btn btn-sm btn-primary">
                                    <i class="fas fa-arrow-right me-1"></i> Proceed to Reset Password
                                </a>
                            </div>
                        </div>
                    `;
                }
            } catch (error) {
                showToast('Error', error.message, 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Send Reset Link';
            }
        });
    }

    // 4. Reset Password Form
    const resetForm = document.getElementById('reset-password-form');
    if (resetForm) {
        // Auto extract token from URL query string if present
        const urlParams = new URLSearchParams(window.location.search);
        const tokenFromUrl = urlParams.get('token');
        const tokenInput = document.getElementById('reset_token');
        if (tokenInput && tokenFromUrl) {
            tokenInput.value = tokenFromUrl;
        }

        resetForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = resetForm.querySelector('button[type="submit"]');
            const token = document.getElementById('reset_token').value.trim();
            const newPassword = document.getElementById('new_password').value;
            const confirmPassword = document.getElementById('confirm_new_password').value;

            if (newPassword !== confirmPassword) {
                showToast('Password Mismatch', 'New password and confirmation password do not match.', 'error');
                return;
            }

            try {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Updating...';

                const response = await apiRequest('/api/auth/reset-password', {
                    method: 'POST',
                    body: JSON.stringify({
                        token: token,
                        new_password: newPassword,
                        confirm_new_password: confirmPassword
                    })
                });

                showToast('Success!', response.message, 'success');
                setTimeout(() => {
                    navigateTo('/login.html');
                }, 1500);
            } catch (error) {
                showToast('Reset Failed', error.message, 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Update Password';
            }
        });
    }
}

// Demo Credentials Autofill Helper
function fillDemoUser(username, password) {
    const userField = document.getElementById('username_or_email');
    const passField = document.getElementById('password');
    if (userField && passField) {
        userField.value = username;
        passField.value = password;
        showToast('Credentials Filled', `Filled demo login: ${username}`, 'info');
    }
}
