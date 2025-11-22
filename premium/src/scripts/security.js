// Premium Security Module - Zero Trust Architecture
'use strict';

class PremiumSecurity {
    constructor() {
        this.csrfToken = null;
        this.sessionId = null;
        this.rateLimits = new Map();
        this.allowedIPs = [];
        this.encryptionKey = null;
        this.init();
    }

    init() {
        this.setupContentProtection();
        this.initializeCSRF();
        this.setupRateLimiting();
        this.enableSecurityHeaders();
        this.setupDevToolsProtection();
        this.initializeEncryption();
    }

    setupContentProtection() {
        // Disable right-click
        document.addEventListener('contextmenu', e => {
            e.preventDefault();
            this.logSecurityEvent('CONTEXT_MENU_BLOCKED');
            return false;
        });

        // Disable text selection
        document.addEventListener('selectstart', e => {
            e.preventDefault();
            return false;
        });

        // Disable drag and drop
        document.addEventListener('dragstart', e => {
            e.preventDefault();
            return false;
        });

        // Disable keyboard shortcuts
        document.addEventListener('keydown', e => {
            const blocked = [
                'F12',
                'I', 'J', 'U', 'S', 'A', 'P'
            ];
            
            if (blocked.includes(e.key) && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                this.logSecurityEvent('KEYBOARD_SHORTCUT_BLOCKED', { key: e.key });
                return false;
            }
        });

        // Add security overlay
        this.addSecurityOverlay();
    }

    addSecurityOverlay() {
        const overlay = document.getElementById('security-overlay');
        if (overlay) {
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 9999;
                background: transparent;
            `;
        }
    }

    initializeCSRF() {
        this.csrfToken = this.generateSecureToken();
        this.setupCSRFHeaders();
    }

    generateSecureToken() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    setupCSRFHeaders() {
        const originalFetch = window.fetch;
        window.fetch = (url, options = {}) => {
            options.headers = {
                ...options.headers,
                'X-CSRF-Token': this.csrfToken,
                'X-Requested-With': 'XMLHttpRequest',
                'X-Session-ID': this.sessionId
            };
            return originalFetch(url, options);
        };
    }

    setupRateLimiting() {
        this.rateLimits.set('login', { max: 5, window: 900000, attempts: [] }); // 5 attempts per 15 min
        this.rateLimits.set('api', { max: 100, window: 60000, attempts: [] }); // 100 per minute
        this.rateLimits.set('search', { max: 20, window: 60000, attempts: [] }); // 20 per minute
    }

    checkRateLimit(action, identifier = 'default') {
        const limit = this.rateLimits.get(action);
        if (!limit) return true;

        const now = Date.now();
        const key = `${action}:${identifier}`;
        
        // Clean old attempts
        limit.attempts = limit.attempts.filter(time => now - time < limit.window);
        
        if (limit.attempts.length >= limit.max) {
            this.logSecurityEvent('RATE_LIMIT_EXCEEDED', { action, identifier });
            return false;
        }

        limit.attempts.push(now);
        return true;
    }

    enableSecurityHeaders() {
        // Content Security Policy
        const meta = document.createElement('meta');
        meta.httpEquiv = 'Content-Security-Policy';
        meta.content = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;";
        document.head.appendChild(meta);
    }

    setupDevToolsProtection() {
        let devtools = { open: false };
        const threshold = 160;

        setInterval(() => {
            if (window.outerHeight - window.innerHeight > threshold || 
                window.outerWidth - window.innerWidth > threshold) {
                if (!devtools.open) {
                    devtools.open = true;
                    this.handleDevToolsDetection();
                }
            } else {
                devtools.open = false;
            }
        }, 500);

        // Console protection
        if (this.isProduction()) {
            this.disableConsole();
        }
    }

    handleDevToolsDetection() {
        this.logSecurityEvent('DEV_TOOLS_DETECTED');
        if (this.isProduction()) {
            window.location.href = '/security-violation';
        }
    }

    disableConsole() {
        const noop = () => {};
        ['log', 'warn', 'error', 'info', 'debug', 'trace'].forEach(method => {
            console[method] = noop;
        });
    }

    initializeEncryption() {
        this.encryptionKey = this.generateEncryptionKey();
    }

    generateEncryptionKey() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return array;
    }

    async encryptData(data) {
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(JSON.stringify(data));
        
        const key = await crypto.subtle.importKey(
            'raw',
            this.encryptionKey,
            { name: 'AES-GCM' },
            false,
            ['encrypt']
        );

        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            key,
            dataBuffer
        );

        return {
            data: Array.from(new Uint8Array(encrypted)),
            iv: Array.from(iv)
        };
    }

    async decryptData(encryptedData) {
        try {
            const key = await crypto.subtle.importKey(
                'raw',
                this.encryptionKey,
                { name: 'AES-GCM' },
                false,
                ['decrypt']
            );

            const decrypted = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: new Uint8Array(encryptedData.iv) },
                key,
                new Uint8Array(encryptedData.data)
            );

            const decoder = new TextDecoder();
            return JSON.parse(decoder.decode(decrypted));
        } catch (error) {
            this.logSecurityEvent('DECRYPTION_ERROR', { error: error.message });
            return null;
        }
    }

    validateInput(input, type) {
        const patterns = {
            email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            iccid: /^[0-9]{19,20}$/,
            phone: /^\+?[1-9]\d{1,14}$/,
            alphanumeric: /^[a-zA-Z0-9\s]+$/,
            uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        };

        if (!patterns[type]) return false;
        return patterns[type].test(input);
    }

    sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        
        return input
            .replace(/[<>]/g, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+=/gi, '')
            .trim();
    }

    async secureApiCall(endpoint, options = {}) {
        if (!this.checkRateLimit('api')) {
            throw new Error('Rate limit exceeded');
        }

        const secureOptions = {
            ...options,
            headers: {
                ...options.headers,
                'X-CSRF-Token': this.csrfToken,
                'X-Session-ID': this.sessionId,
                'Content-Type': 'application/json'
            }
        };

        try {
            const response = await fetch(endpoint, secureOptions);
            
            if (!response.ok) {
                this.logSecurityEvent('API_ERROR', {
                    endpoint,
                    status: response.status
                });
                throw new Error(`API Error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            this.logSecurityEvent('API_FAILURE', {
                endpoint,
                error: error.message
            });
            throw error;
        }
    }

    setupIPAllowlist(allowedIPs) {
        this.allowedIPs = allowedIPs;
    }

    async validateIPAccess() {
        try {
            const response = await fetch('/api/client-ip');
            const { ip } = await response.json();
            
            if (this.allowedIPs.length > 0 && !this.allowedIPs.includes(ip)) {
                this.logSecurityEvent('IP_ACCESS_DENIED', { ip });
                throw new Error('Access denied from this IP address');
            }
            
            return true;
        } catch (error) {
            this.logSecurityEvent('IP_VALIDATION_ERROR', { error: error.message });
            return false;
        }
    }

    setupSessionProtection() {
        this.sessionId = this.generateSecureToken();
        
        // Session timeout
        const timeout = 30 * 60 * 1000; // 30 minutes
        let lastActivity = Date.now();

        ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
            document.addEventListener(event, () => {
                lastActivity = Date.now();
            }, { passive: true });
        });

        setInterval(() => {
            if (Date.now() - lastActivity > timeout) {
                this.handleSessionTimeout();
            }
        }, 60000);

        // Concurrent session detection
        window.addEventListener('storage', (e) => {
            if (e.key === 'sessionId' && e.newValue !== this.sessionId) {
                this.handleConcurrentSession();
            }
        });

        localStorage.setItem('sessionId', this.sessionId);
    }

    handleSessionTimeout() {
        this.logSecurityEvent('SESSION_TIMEOUT');
        this.clearSensitiveData();
        window.location.href = '/login?reason=timeout';
    }

    handleConcurrentSession() {
        this.logSecurityEvent('CONCURRENT_SESSION_DETECTED');
        if (!confirm('Another session detected. Continue with this session?')) {
            this.clearSensitiveData();
            window.location.href = '/login';
        }
    }

    clearSensitiveData() {
        localStorage.clear();
        sessionStorage.clear();
        
        // Clear cookies
        document.cookie.split(";").forEach(cookie => {
            const eqPos = cookie.indexOf("=");
            const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        });
    }

    logSecurityEvent(event, data = {}) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            event,
            data,
            userAgent: navigator.userAgent,
            url: window.location.href,
            sessionId: this.sessionId,
            csrfToken: this.csrfToken
        };

        // Send to security endpoint
        this.sendSecurityLog(logEntry);
    }

    async sendSecurityLog(logEntry) {
        try {
            await fetch('/api/security/log', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': this.csrfToken
                },
                body: JSON.stringify(logEntry)
            });
        } catch (error) {
            if (!this.isProduction()) {
                console.error('Security log failed:', error);
            }
        }
    }

    isProduction() {
        return !['localhost', '127.0.0.1'].includes(window.location.hostname);
    }

    // Data Loss Prevention
    setupDLP() {
        // Prevent clipboard access
        document.addEventListener('copy', e => {
            e.clipboardData.setData('text/plain', 'Access Denied');
            e.preventDefault();
            this.logSecurityEvent('COPY_ATTEMPT_BLOCKED');
        });

        // Prevent print
        window.addEventListener('beforeprint', e => {
            e.preventDefault();
            this.logSecurityEvent('PRINT_ATTEMPT_BLOCKED');
            return false;
        });

        // Prevent screenshot (limited effectiveness)
        document.addEventListener('keyup', e => {
            if (e.key === 'PrintScreen') {
                this.logSecurityEvent('SCREENSHOT_ATTEMPT');
            }
        });
    }

    // Obfuscation
    obfuscateText(text, visibleChars = 4) {
        if (!text || text.length <= visibleChars) return text;
        const visible = text.slice(0, visibleChars);
        const hidden = '*'.repeat(text.length - visibleChars);
        return visible + hidden;
    }

    // Initialize all security features
    enableFullSecurity() {
        this.setupSessionProtection();
        this.setupDLP();
        this.logSecurityEvent('SECURITY_INITIALIZED');
    }
}

// Initialize security
const premiumSecurity = new PremiumSecurity();
premiumSecurity.enableFullSecurity();

// Export for global access
window.PremiumSecurity = premiumSecurity;