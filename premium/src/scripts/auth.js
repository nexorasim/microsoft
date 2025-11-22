// Premium Authentication System - RBAC + MFA
'use strict';

class PremiumAuth {
    constructor() {
        this.currentUser = null;
        this.sessionToken = null;
        this.refreshToken = null;
        this.mfaSecret = null;
        this.permissions = [];
        this.roles = {
            admin: ['user.create', 'user.read', 'user.update', 'user.delete', 'esim.create', 'esim.read', 'esim.update', 'esim.delete', 'audit.read', 'security.manage'],
            operator: ['user.read', 'esim.create', 'esim.read', 'esim.update', 'audit.read'],
            user: ['esim.read']
        };
        this.init();
    }

    init() {
        this.setupAuthForm();
        this.checkExistingSession();
        this.setupAutoRefresh();
    }

    setupAuthForm() {
        document.addEventListener('DOMContentLoaded', () => {
            const authForm = document.getElementById('auth-form');
            if (authForm) {
                authForm.addEventListener('submit', (e) => this.handleLogin(e));
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

        this.clearErrors();

        if (!this.validateLoginInputs(email, password)) {
            return;
        }

        if (!window.PremiumSecurity.checkRateLimit('login', email)) {
            this.showError('Too many login attempts. Please try again later.');
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

            const response = await window.PremiumSecurity.secureApiCall('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify(loginData)
            });

            if (response.success) {
                if (response.mfaRequired && !mfaCode) {
                    this.showMFARequired();
                    return;
                }

                await this.handleLoginSuccess(response);
            } else {
                this.handleLoginFailure(response.error);
            }
        } catch (error) {
            this.showError('Login failed. Please try again.');
            this.handleLoginFailure(error.message);
        } finally {
            this.setLoginLoading(false);
        }
    }

    validateLoginInputs(email, password) {
        let isValid = true;

        if (!email || !window.PremiumSecurity.validateInput(email, 'email')) {
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
        const data = encoder.encode(password + 'nexorasim_salt');
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
        ctx.fillText('Fingerprint', 2, 2);
        
        return btoa(JSON.stringify({
            screen: `${screen.width}x${screen.height}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            language: navigator.language,
            platform: navigator.platform,
            canvas: canvas.toDataURL().substring(0, 50)
        }));
    }

    showMFARequired() {
        const mfaGroup = document.getElementById('mfa-group');
        const mfaCode = document.getElementById('mfa-code');
        
        mfaGroup.style.display = 'block';
        mfaCode.focus();
        mfaCode.required = true;
        
        this.showInfo('Please enter your 6-digit MFA code to complete login.');
    }

    async handleLoginSuccess(response) {
        this.sessionToken = response.token;
        this.refreshToken = response.refreshToken;
        this.currentUser = response.user;
        this.permissions = this.roles[response.user.role] || [];

        // Store encrypted session data
        const encryptedData = await window.PremiumSecurity.encryptData({
            sessionToken: this.sessionToken,
            refreshToken: this.refreshToken,
            user: this.currentUser,
            permissions: this.permissions
        });

        localStorage.setItem('session', JSON.stringify(encryptedData));
        
        this.logAuditEvent('LOGIN_SUCCESS', {
            userId: this.currentUser.id,
            role: this.currentUser.role
        });

        this.showMainPortal();
    }

    handleLoginFailure(error) {
        this.logAuditEvent('LOGIN_FAILURE', { error });
        this.showError('Invalid credentials. Please try again.');
    }

    async checkExistingSession() {
        const sessionData = localStorage.getItem('session');
        if (!sessionData) {
            this.showAuthPortal();
            return;
        }

        try {
            const decryptedData = await window.PremiumSecurity.decryptData(JSON.parse(sessionData));
            if (!decryptedData) {
                this.showAuthPortal();
                return;
            }

            this.sessionToken = decryptedData.sessionToken;
            this.refreshToken = decryptedData.refreshToken;
            this.currentUser = decryptedData.user;
            this.permissions = decryptedData.permissions;

            const isValid = await this.validateSession();
            if (isValid) {
                this.showMainPortal();
            } else {
                this.showAuthPortal();
            }
        } catch (error) {
            this.showAuthPortal();
        }
    }

    async validateSession() {
        try {
            const response = await window.PremiumSecurity.secureApiCall('/api/auth/validate', {
                method: 'POST',
                body: JSON.stringify({ token: this.sessionToken })
            });

            if (response.valid) {
                this.logAuditEvent('SESSION_VALIDATED', { userId: this.currentUser.id });
                return true;
            }
        } catch (error) {
            console.error('Session validation failed:', error);
        }

        this.clearSession();
        return false;
    }

    setupAutoRefresh() {
        setInterval(async () => {
            if (this.refreshToken) {
                try {
                    const response = await window.PremiumSecurity.secureApiCall('/api/auth/refresh', {
                        method: 'POST',
                        body: JSON.stringify({ refreshToken: this.refreshToken })
                    });

                    if (response.success) {
                        this.sessionToken = response.token;
                        this.updateStoredSession();
                        this.logAuditEvent('TOKEN_REFRESHED', { userId: this.currentUser.id });
                    } else {
                        this.handleLogout();
                    }
                } catch (error) {
                    this.handleLogout();
                }
            }
        }, 25 * 60 * 1000); // Refresh every 25 minutes
    }

    async updateStoredSession() {
        const encryptedData = await window.PremiumSecurity.encryptData({
            sessionToken: this.sessionToken,
            refreshToken: this.refreshToken,
            user: this.currentUser,
            permissions: this.permissions
        });

        localStorage.setItem('session', JSON.stringify(encryptedData));
    }

    async handleLogout() {
        try {
            await window.PremiumSecurity.secureApiCall('/api/auth/logout', {
                method: 'POST',
                body: JSON.stringify({ token: this.sessionToken })
            });
        } catch (error) {
            console.error('Logout API call failed:', error);
        }

        this.logAuditEvent('LOGOUT', { userId: this.currentUser?.id });
        this.clearSession();
        this.showAuthPortal();
    }

    clearSession() {
        this.currentUser = null;
        this.sessionToken = null;
        this.refreshToken = null;
        this.permissions = [];
        
        localStorage.removeItem('session');
        window.PremiumSecurity.clearSensitiveData();
    }

    showAuthPortal() {
        document.getElementById('loading-screen').style.display = 'none';
        document.getElementById('auth-portal').style.display = 'flex';
        document.getElementById('main-portal').style.display = 'none';
        
        setTimeout(() => {
            const emailField = document.getElementById('email');
            if (emailField) emailField.focus();
        }, 100);
    }

    showMainPortal() {
        document.getElementById('loading-screen').style.display = 'none';
        document.getElementById('auth-portal').style.display = 'none';
        document.getElementById('main-portal').style.display = 'flex';
        
        this.updateUserInterface();
    }

    updateUserInterface() {
        if (this.currentUser) {
            const userEmail = document.getElementById('user-email');
            const userRole = document.getElementById('user-role');
            
            if (userEmail) userEmail.textContent = this.currentUser.email;
            if (userRole) userRole.textContent = this.currentUser.role;
        }
    }

    // Role-Based Access Control
    hasPermission(permission) {
        return this.permissions.includes(permission) || this.currentUser?.role === 'admin';
    }

    requirePermission(permission) {
        if (!this.hasPermission(permission)) {
            this.logAuditEvent('ACCESS_DENIED', { permission, userId: this.currentUser?.id });
            throw new Error(`Access denied: ${permission} permission required`);
        }
    }

    // MFA Management
    async generateMFASecret() {
        const secret = this.generateSecureToken(32);
        this.mfaSecret = secret;
        
        const qrCodeUrl = `otpauth://totp/NexoraSIM:${this.currentUser.email}?secret=${secret}&issuer=NexoraSIM`;
        return { secret, qrCodeUrl };
    }

    async verifyMFACode(code) {
        try {
            const response = await window.PremiumSecurity.secureApiCall('/api/auth/mfa/verify', {
                method: 'POST',
                body: JSON.stringify({ 
                    code, 
                    secret: this.mfaSecret,
                    userId: this.currentUser.id 
                })
            });

            return response.valid;
        } catch (error) {
            this.logAuditEvent('MFA_VERIFICATION_ERROR', { error: error.message });
            return false;
        }
    }

    generateSecureToken(length = 32) {
        const array = new Uint8Array(length);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    // UI Helper Methods
    setLoginLoading(loading) {
        const submitBtn = document.querySelector('#auth-form button[type="submit"]');
        const authForm = document.getElementById('auth-form');
        
        if (loading) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Signing In...';
            authForm.style.opacity = '0.7';
        } else {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Sign In Securely';
            authForm.style.opacity = '1';
        }
    }

    clearErrors() {
        document.querySelectorAll('.error-text').forEach(el => {
            el.textContent = '';
        });
    }

    showFieldError(fieldId, message) {
        const errorElement = document.getElementById(`${fieldId}-error`);
        if (errorElement) {
            errorElement.textContent = message;
        }
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showInfo(message) {
        this.showNotification(message, 'info');
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 16px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10001;
            max-width: 400px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;

        const colors = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#2e70e5'
        };

        notification.style.backgroundColor = colors[type] || colors.info;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    logAuditEvent(event, data = {}) {
        const auditEntry = {
            timestamp: new Date().toISOString(),
            event,
            data,
            userId: this.currentUser?.id,
            userEmail: this.currentUser?.email,
            sessionId: window.PremiumSecurity.sessionId
        };

        window.PremiumSecurity.secureApiCall('/api/audit/log', {
            method: 'POST',
            body: JSON.stringify(auditEntry)
        }).catch(error => {
            console.error('Audit log failed:', error);
        });
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isAuthenticated() {
        return !!this.sessionToken && !!this.currentUser;
    }
}

// Initialize authentication
const premiumAuth = new PremiumAuth();

// Export for global access
window.PremiumAuth = premiumAuth;