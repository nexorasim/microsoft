// NexoraSIM Enterprise Authentication Module
'use strict';

class AuthenticationManager {
    constructor() {
        this.currentUser = null;
        this.sessionToken = null;
        this.refreshToken = null;
        this.tokenExpiry = null;
        this.mfaRequired = false;
        this.loginAttempts = 0;
        this.maxLoginAttempts = 5;
        this.lockoutDuration = 15 * 60 * 1000; // 15 minutes
        
        this.init();
    }

    init() {
        this.checkExistingSession();
        this.setupLoginForm();
        this.setupAutoRefresh();
        this.setupSessionMonitoring();
    }

    checkExistingSession() {
        const token = localStorage.getItem('sessionToken');
        const expiry = localStorage.getItem('tokenExpiry');
        
        if (token && expiry && new Date(expiry) > new Date()) {
            this.sessionToken = token;
            this.tokenExpiry = new Date(expiry);
            this.validateSession();
        } else {
            this.showLoginPortal();
        }
    }

    async validateSession() {
        try {
            const response = await window.SecurityManager.secureApiCall('/api/auth/validate', {
                method: 'POST',
                body: JSON.stringify({ token: this.sessionToken })
            });

            if (response.valid) {
                this.currentUser = response.user;
                this.showMainPortal();
                this.logAuditEvent('SESSION_VALIDATED', { userId: this.currentUser.id });
            } else {
                this.clearSession();
                this.showLoginPortal();
            }
        } catch (error) {
            console.error('Session validation failed:', error);
            this.clearSession();
            this.showLoginPortal();
        }
    }

    setupLoginForm() {
        document.addEventListener('DOMContentLoaded', () => {
            const loginForm = document.getElementById('login-form');
            if (loginForm) {
                loginForm.addEventListener('submit', (e) => this.handleLogin(e));
            }

            const logoutBtn = document.getElementById('logout-btn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', () => this.handleLogout());
            }
        });
    }

    async handleLogin(event) {
        event.preventDefault();
        
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const mfaCode = document.getElementById('mfa-code').value.trim();

        // Clear previous errors
        this.clearErrors();

        // Validate inputs
        if (!this.validateLoginInputs(email, password)) {
            return;
        }

        // Check rate limiting
        if (!window.SecurityManager.checkRateLimit('login', email)) {
            this.showError('Too many login attempts. Please try again later.');
            return;
        }

        // Check account lockout
        if (this.isAccountLocked(email)) {
            this.showError('Account temporarily locked due to multiple failed attempts.');
            return;
        }

        this.setLoginLoading(true);

        try {
            const loginData = {
                email,
                password: await this.hashPassword(password),
                mfaCode,
                deviceFingerprint: this.generateDeviceFingerprint()
            };

            const response = await window.SecurityManager.secureApiCall('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify(loginData)
            });

            if (response.success) {
                if (response.mfaRequired && !mfaCode) {
                    this.mfaRequired = true;
                    this.showMFARequired();
                    return;
                }

                this.handleLoginSuccess(response);
            } else {
                this.handleLoginFailure(response.error, email);
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showError('Login failed. Please try again.');
            this.handleLoginFailure('Network error', email);
        } finally {
            this.setLoginLoading(false);
        }
    }

    validateLoginInputs(email, password) {
        let isValid = true;

        if (!email || !window.SecurityManager.validateInput(email, 'email')) {
            this.showFieldError('email', 'Please enter a valid email address');
            isValid = false;
        }

        if (!password || password.length < 8) {
            this.showFieldError('password', 'Password must be at least 8 characters');
            isValid = false;
        }

        return isValid;
    }

    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hash = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hash))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    generateDeviceFingerprint() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('Device fingerprint', 2, 2);
        
        return btoa(JSON.stringify({
            screen: `${screen.width}x${screen.height}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            language: navigator.language,
            platform: navigator.platform,
            userAgent: navigator.userAgent.substring(0, 100),
            canvas: canvas.toDataURL().substring(0, 100)
        }));
    }

    handleLoginSuccess(response) {
        this.sessionToken = response.token;
        this.refreshToken = response.refreshToken;
        this.tokenExpiry = new Date(response.expiry);
        this.currentUser = response.user;

        // Store session data
        localStorage.setItem('sessionToken', this.sessionToken);
        localStorage.setItem('refreshToken', this.refreshToken);
        localStorage.setItem('tokenExpiry', this.tokenExpiry.toISOString());
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));

        // Reset login attempts
        this.loginAttempts = 0;
        localStorage.removeItem(`lockout_${response.user.email}`);

        // Log successful login
        this.logAuditEvent('LOGIN_SUCCESS', {
            userId: this.currentUser.id,
            email: this.currentUser.email,
            role: this.currentUser.role
        });

        // Show main portal
        this.showMainPortal();
    }

    handleLoginFailure(error, email) {
        this.loginAttempts++;
        
        // Track failed attempts per email
        const attemptKey = `attempts_${email}`;
        const attempts = parseInt(localStorage.getItem(attemptKey) || '0') + 1;
        localStorage.setItem(attemptKey, attempts.toString());

        if (attempts >= this.maxLoginAttempts) {
            const lockoutKey = `lockout_${email}`;
            localStorage.setItem(lockoutKey, (Date.now() + this.lockoutDuration).toString());
            this.showError(`Account locked for ${this.lockoutDuration / 60000} minutes due to multiple failed attempts.`);
        } else {
            const remaining = this.maxLoginAttempts - attempts;
            this.showError(`Invalid credentials. ${remaining} attempts remaining.`);
        }

        // Log failed login
        this.logAuditEvent('LOGIN_FAILURE', {
            email,
            error,
            attempts,
            ip: this.getClientIP()
        });
    }

    isAccountLocked(email) {
        const lockoutKey = `lockout_${email}`;
        const lockoutTime = localStorage.getItem(lockoutKey);
        
        if (lockoutTime && Date.now() < parseInt(lockoutTime)) {
            return true;
        }
        
        // Clear expired lockout
        if (lockoutTime) {
            localStorage.removeItem(lockoutKey);
            localStorage.removeItem(`attempts_${email}`);
        }
        
        return false;
    }

    showMFARequired() {
        const mfaField = document.getElementById('mfa-code');
        const mfaGroup = mfaField.closest('.form-group');
        mfaGroup.style.display = 'block';
        mfaField.focus();
        mfaField.required = true;
        
        this.showInfo('Please enter your 6-digit MFA code to complete login.');
    }

    async handleLogout() {
        try {
            // Notify server of logout
            await window.SecurityManager.secureApiCall('/api/auth/logout', {
                method: 'POST',
                body: JSON.stringify({ token: this.sessionToken })
            });
        } catch (error) {
            console.error('Logout API call failed:', error);
        }

        // Log logout event
        this.logAuditEvent('LOGOUT', {
            userId: this.currentUser?.id,
            sessionDuration: this.getSessionDuration()
        });

        // Clear session
        this.clearSession();
        
        // Show login portal
        this.showLoginPortal();
    }

    clearSession() {
        this.currentUser = null;
        this.sessionToken = null;
        this.refreshToken = null;
        this.tokenExpiry = null;
        
        // Clear storage
        localStorage.removeItem('sessionToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('tokenExpiry');
        localStorage.removeItem('currentUser');
        
        // Clear sensitive data
        window.SecurityManager.clearSensitiveData();
    }

    setupAutoRefresh() {
        setInterval(() => {
            if (this.sessionToken && this.tokenExpiry) {
                const timeUntilExpiry = this.tokenExpiry.getTime() - Date.now();
                
                // Refresh token if it expires in less than 5 minutes
                if (timeUntilExpiry < 5 * 60 * 1000 && timeUntilExpiry > 0) {
                    this.refreshSessionToken();
                }
            }
        }, 60000); // Check every minute
    }

    async refreshSessionToken() {
        if (!this.refreshToken) {
            this.handleLogout();
            return;
        }

        try {
            const response = await window.SecurityManager.secureApiCall('/api/auth/refresh', {
                method: 'POST',
                body: JSON.stringify({ refreshToken: this.refreshToken })
            });

            if (response.success) {
                this.sessionToken = response.token;
                this.tokenExpiry = new Date(response.expiry);
                
                localStorage.setItem('sessionToken', this.sessionToken);
                localStorage.setItem('tokenExpiry', this.tokenExpiry.toISOString());
                
                this.logAuditEvent('TOKEN_REFRESHED', { userId: this.currentUser.id });
            } else {
                this.handleLogout();
            }
        } catch (error) {
            console.error('Token refresh failed:', error);
            this.handleLogout();
        }
    }

    setupSessionMonitoring() {
        // Monitor for concurrent sessions
        window.addEventListener('storage', (e) => {
            if (e.key === 'sessionToken' && e.newValue !== this.sessionToken) {
                this.handleConcurrentSession();
            }
        });

        // Monitor for tab visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible' && this.sessionToken) {
                this.validateSession();
            }
        });
    }

    handleConcurrentSession() {
        this.logAuditEvent('CONCURRENT_SESSION_DETECTED', {
            userId: this.currentUser?.id
        });
        
        if (confirm('Another session has been detected. Continue with this session?')) {
            // Keep current session
            localStorage.setItem('sessionToken', this.sessionToken);
        } else {
            this.handleLogout();
        }
    }

    showLoginPortal() {
        document.getElementById('loading-screen').style.display = 'none';
        document.getElementById('login-portal').style.display = 'flex';
        document.getElementById('main-portal').style.display = 'none';
        
        // Focus on email field
        setTimeout(() => {
            const emailField = document.getElementById('email');
            if (emailField) emailField.focus();
        }, 100);
    }

    showMainPortal() {
        document.getElementById('loading-screen').style.display = 'none';
        document.getElementById('login-portal').style.display = 'none';
        document.getElementById('main-portal').style.display = 'flex';
        
        // Update user info
        this.updateUserInterface();
    }

    updateUserInterface() {
        if (this.currentUser) {
            const userInfoElement = document.getElementById('user-info');
            const userRoleElement = document.getElementById('user-role');
            
            if (userInfoElement) {
                userInfoElement.textContent = this.currentUser.email;
            }
            
            if (userRoleElement) {
                userRoleElement.textContent = this.currentUser.role;
            }
        }
    }

    setLoginLoading(loading) {
        const loginBtn = document.getElementById('login-btn');
        const loginForm = document.getElementById('login-form');
        
        if (loading) {
            loginBtn.disabled = true;
            loginBtn.innerHTML = '<span>Signing In...</span>';
            loginForm.style.opacity = '0.7';
        } else {
            loginBtn.disabled = false;
            loginBtn.innerHTML = '<span>Sign In Securely</span>';
            loginForm.style.opacity = '1';
        }
    }

    clearErrors() {
        document.querySelectorAll('.error-message').forEach(el => {
            el.textContent = '';
        });
        
        document.querySelectorAll('.form-input').forEach(el => {
            el.classList.remove('error');
        });
    }

    showFieldError(fieldId, message) {
        const field = document.getElementById(fieldId);
        const errorElement = document.getElementById(`${fieldId}-error`);
        
        if (field) field.classList.add('error');
        if (errorElement) errorElement.textContent = message;
    }

    showError(message) {
        // Create or update error notification
        let errorDiv = document.getElementById('login-error');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.id = 'login-error';
            errorDiv.className = 'error-notification';
            errorDiv.style.cssText = `
                background: #dc3545;
                color: white;
                padding: 12px 16px;
                border-radius: 4px;
                margin-bottom: 16px;
                font-size: 0.9rem;
            `;
            
            const loginForm = document.getElementById('login-form');
            loginForm.insertBefore(errorDiv, loginForm.firstChild);
        }
        
        errorDiv.textContent = message;
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 5000);
    }

    showInfo(message) {
        // Similar to showError but with info styling
        let infoDiv = document.getElementById('login-info');
        if (!infoDiv) {
            infoDiv = document.createElement('div');
            infoDiv.id = 'login-info';
            infoDiv.className = 'info-notification';
            infoDiv.style.cssText = `
                background: #17a2b8;
                color: white;
                padding: 12px 16px;
                border-radius: 4px;
                margin-bottom: 16px;
                font-size: 0.9rem;
            `;
            
            const loginForm = document.getElementById('login-form');
            loginForm.insertBefore(infoDiv, loginForm.firstChild);
        }
        
        infoDiv.textContent = message;
    }

    getSessionDuration() {
        const loginTime = localStorage.getItem('loginTime');
        if (loginTime) {
            return Date.now() - parseInt(loginTime);
        }
        return 0;
    }

    getClientIP() {
        // This would typically be handled server-side
        return 'client-side-unknown';
    }

    logAuditEvent(event, data = {}) {
        const auditEntry = {
            timestamp: new Date().toISOString(),
            event,
            data,
            sessionId: this.sessionToken ? 'authenticated' : 'anonymous',
            userAgent: navigator.userAgent
        };

        // Send to audit logging endpoint
        window.SecurityManager.secureApiCall('/api/audit/log', {
            method: 'POST',
            body: JSON.stringify(auditEntry)
        }).catch(error => {
            console.error('Failed to log audit event:', error);
        });
    }

    // Role-based access control
    hasPermission(permission) {
        if (!this.currentUser || !this.currentUser.permissions) {
            return false;
        }
        
        return this.currentUser.permissions.includes(permission) ||
               this.currentUser.role === 'admin';
    }

    requirePermission(permission) {
        if (!this.hasPermission(permission)) {
            throw new Error(`Access denied: ${permission} permission required`);
        }
    }

    // Get current user info
    getCurrentUser() {
        return this.currentUser;
    }

    isAuthenticated() {
        return !!this.sessionToken && !!this.currentUser;
    }
}

// Initialize authentication manager
const authManager = new AuthenticationManager();

// Export for use in other modules
window.AuthManager = authManager;