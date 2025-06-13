// Auth state management
const auth = {
    token: localStorage.getItem('token'),
    user: JSON.parse(localStorage.getItem('user') || 'null'),

    setAuth(token, user) {
        console.log('Setting auth:', { token: !!token, user: !!user });
        this.token = token;
        this.user = user;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
    },

    clearAuth() {
        console.log('Clearing auth');
        this.token = null;
        this.user = null;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    },

    isAuthenticated() {
        const hasToken = !!this.token;
        console.log('Checking authentication:', { hasToken });
        return hasToken;
    },

    async verifyToken() {
        console.log('Verifying token:', { token: !!this.token });
        if (!this.token) return false;
        
        try {
            console.log('Making /api/auth/me request');
            const response = await fetch('/api/auth/me', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            console.log('Auth response:', { 
                status: response.status, 
                ok: response.ok 
            });

            if (!response.ok) {
                const data = await response.json();
                console.log('Auth failed:', data);
                this.clearAuth();
                return false;
            }

            const userData = await response.json();
            console.log('Auth successful:', { user: !!userData });
            this.user = userData;
            localStorage.setItem('user', JSON.stringify(userData));
            return true;
        } catch (error) {
            console.error('Token verification error:', error);
            this.clearAuth();
            return false;
        }
    },

    // New method to handle auth redirects
    async handleAuthRedirect() {
        const isAuthPage = window.location.pathname === '/login.html' || 
                          window.location.pathname === '/register.html';
        const isProtectedPage = !isAuthPage && window.location.pathname !== '/';

        console.log('Auth redirect check:', { isAuthPage, isProtectedPage });

        if (isAuthPage) {
            if (this.isAuthenticated()) {
                const isValid = await this.verifyToken();
                if (isValid) {
                    console.log('Already authenticated, redirecting to home');
                    window.location.replace('/');
                    return true;
                }
            }
            return false;
        }

        if (isProtectedPage) {
            if (!this.isAuthenticated()) {
                console.log('Not authenticated, redirecting to login');
                window.location.replace('/login.html');
                return false;
            }

            const isValid = await this.verifyToken();
            if (!isValid) {
                console.log('Token invalid, redirecting to login');
                this.clearAuth();
                window.location.replace('/login.html');
                return false;
            }
        }

        return true;
    }
};

// Toast notification system
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-4 right-4 px-4 py-2 rounded-lg text-white transform transition-all duration-300 ease-in-out ${
        type === 'error' ? 'bg-red-500' :
        type === 'success' ? 'bg-green-500' :
        'bg-blue-500'
    }`;
    toast.textContent = message;

    const container = document.getElementById('toastContainer');
    if (container) {
        container.appendChild(toast);
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

// Initialize auth system
document.addEventListener('DOMContentLoaded', async () => {
    // Handle auth redirects
    await auth.handleAuthRedirect();

    // Get form elements
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const logoutBtn = document.getElementById('logoutBtn');

    // Handle login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const emailInput = loginForm.querySelector('#email');
            const passwordInput = loginForm.querySelector('#password');
            const errorMessage = loginForm.querySelector('#errorMessage');

            if (!emailInput || !passwordInput) {
                console.error('Login form elements not found');
                return;
            }

            const email = emailInput.value.trim();
            const password = passwordInput.value;

            if (!email || !password) {
                if (errorMessage) {
                    errorMessage.textContent = 'Please fill in all fields';
                    errorMessage.classList.remove('hidden');
                }
                return;
            }

            try {
                console.log('Attempting login...');
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();
                console.log('Login response:', { ok: response.ok, hasToken: !!data.token });

                if (response.ok) {
                    console.log('Login successful, setting auth...');
                    auth.setAuth(data.token, data.user);
                    showToast('Login successful!', 'success');
                    window.location.replace('/');
                } else {
                    if (errorMessage) {
                        errorMessage.textContent = data.message || 'Login failed';
                        errorMessage.classList.remove('hidden');
                    }
                    showToast(data.message || 'Login failed', 'error');
                }
            } catch (error) {
                console.error('Login error:', error);
                if (errorMessage) {
                    errorMessage.textContent = 'Error connecting to server';
                    errorMessage.classList.remove('hidden');
                }
                showToast('Error connecting to server', 'error');
            }
        });
    }

    // Handle registration form submission
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const nameInput = registerForm.querySelector('#name');
            const emailInput = registerForm.querySelector('#email');
            const phoneInput = registerForm.querySelector('#phone');
            const passwordInput = registerForm.querySelector('#password');
            const confirmPasswordInput = registerForm.querySelector('#confirmPassword');
            const errorMessage = registerForm.querySelector('#errorMessage');

            if (!nameInput || !emailInput || !passwordInput || !confirmPasswordInput) {
                console.error('Register form elements not found');
                return;
            }

            const name = nameInput.value.trim();
            const email = emailInput.value.trim();
            const phone = phoneInput?.value.trim() || '';
            const password = passwordInput.value;
            const confirmPassword = confirmPasswordInput.value;

            if (!name || !email || !password || !confirmPassword) {
                if (errorMessage) {
                    errorMessage.textContent = 'Please fill in all required fields';
                    errorMessage.classList.remove('hidden');
                }
                return;
            }

            if (password !== confirmPassword) {
                if (errorMessage) {
                    errorMessage.textContent = 'Passwords do not match';
                    errorMessage.classList.remove('hidden');
                }
                return;
            }

            try {
                console.log('Submitting registration...');
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ name, email, password, phone })
                });

                const data = await response.json();
                console.log('Registration response:', { ok: response.ok, hasToken: !!data.token });

                if (response.ok) {
                    console.log('Registration successful, setting auth...');
                    auth.setAuth(data.token, data.user);
                    showToast('Registration successful!', 'success');
                    window.location.href = '/';
                } else {
                    if (errorMessage) {
                        errorMessage.textContent = data.message || 'Registration failed';
                        errorMessage.classList.remove('hidden');
                    }
                    showToast(data.message || 'Registration failed', 'error');
                }
            } catch (error) {
                console.error('Registration error:', error);
                showToast('Error connecting to server', 'error');
            }
        });
    }

    // Handle logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            auth.clearAuth();
            showToast('Logged out successfully', 'success');
            window.location.href = '/login.html';
        });
    }
});

// Export auth functions for use in other scripts
window.auth = {
    getToken: () => auth.token,
    getUser: () => auth.user,
    isAuthenticated: () => auth.isAuthenticated(),
    hasRole: (role) => auth.user?.role === role,
    logout: () => {
        auth.clearAuth();
        window.location.href = '/login.html';
    }
};