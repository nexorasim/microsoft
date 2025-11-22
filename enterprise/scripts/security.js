// NexoraSIM Enterprise Security Module
'use strict';

class SecurityManager {
    constructor() {
        this.initSecurity();
        this.setupProtections();
        this.initCSRF();
        this.setupRateLimit();
    }

    initSecurity() {
        // Disable right-click context menu
        document.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            return false;
        });

        // Disable text selection
        document.addEventListener('selectstart', (e) => {
            e.preventDefault();
            return false;
        });

        // Disable drag and drop
        document.addEventListener('dragstart', (e) => {
            e.preventDefault();
            return false;
        });

        // Disable F12, Ctrl+Shift+I, Ctrl+U, Ctrl+S
        document.addEventListener('keydown', (e) => {
            if (
                e.key === 'F12' ||
                (e.ctrlKey && e.shiftKey && e.key === 'I') ||
                (e.ctrlKey && e.key === 'u') ||
                (e.ctrlKey && e.key === 's') ||
                (e.ctrlKey && e.shiftKey && e.key === 'C') ||
                (e.ctrlKey && e.shiftKey && e.key === 'J')
            ) {
                e.preventDefault();
                this.logSecurityEvent('DEV_TOOLS_ATTEMPT', {
                    key: e.key,
                    ctrlKey: e.ctrlKey,
                    shiftKey: e.shiftKey
                });
                return false;
            }
        });

        // Detect developer tools
        this.detectDevTools();
        
        // Setup console protection
        this.protectConsole();
    }

    setupProtections() {
        // XSS Protection
        this.sanitizeInputs();
        
        // CSRF Protection
        this.setupCSRFProtection();
        
        // Session Protection
        this.setupSessionProtection();
        
        // Content Protection
        this.setupContentProtection();
    }

    detectDevTools() {
        let devtools = {
            open: false,
            orientation: null
        };

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
    }

    handleDevToolsDetection() {
        this.logSecurityEvent('DEV_TOOLS_DETECTED', {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
        });
        
        // Redirect or show warning
        if (this.isProduction()) {
            window.location.href = '/security-violation';
        }
    }

    protectConsole() {
        // Override console methods in production
        if (this.isProduction()) {
            const noop = () => {};
            window.console = {
                log: noop,
                warn: noop,
                error: noop,
                info: noop,
                debug: noop,
                trace: noop,
                dir: noop,
                dirxml: noop,
                group: noop,
                groupEnd: noop,
                time: noop,
                timeEnd: noop,
                profile: noop,
                profileEnd: noop,
                clear: noop
            };
        }
    }

    initCSRF() {
        this.csrfToken = this.generateCSRFToken();
        this.setCSRFHeader();
    }

    generateCSRFToken() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    setCSRFHeader() {
        // Add CSRF token to all AJAX requests
        const originalFetch = window.fetch;
        window.fetch = (url, options = {}) => {
            options.headers = {
                ...options.headers,
                'X-CSRF-Token': this.csrfToken,
                'X-Requested-With': 'XMLHttpRequest'
            };
            return originalFetch(url, options);
        };
    }

    setupCSRFProtection() {
        // Add CSRF token to all forms
        document.addEventListener('DOMContentLoaded', () => {
            const forms = document.querySelectorAll('form');
            forms.forEach(form => {
                const csrfInput = document.createElement('input');
                csrfInput.type = 'hidden';
                csrfInput.name = '_csrf_token';
                csrfInput.value = this.csrfToken;
                form.appendChild(csrfInput);
            });
        });
    }

    sanitizeInputs() {
        document.addEventListener('input', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                e.target.value = this.sanitizeString(e.target.value);
            }
        });
    }

    sanitizeString(str) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            '/': '&#x2F;'
        };
        return str.replace(/[&<>"'/]/g, (s) => map[s]);
    }

    setupSessionProtection() {
        // Session timeout
        this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
        this.lastActivity = Date.now();
        
        // Track user activity
        ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
            document.addEventListener(event, () => {
                this.lastActivity = Date.now();
            }, { passive: true });
        });

        // Check session validity
        setInterval(() => {
            if (Date.now() - this.lastActivity > this.sessionTimeout) {
                this.handleSessionTimeout();
            }
        }, 60000); // Check every minute
    }

    handleSessionTimeout() {
        this.logSecurityEvent('SESSION_TIMEOUT', {
            lastActivity: new Date(this.lastActivity).toISOString()
        });
        
        // Clear sensitive data
        this.clearSensitiveData();
        
        // Redirect to login
        window.location.href = '/login?reason=timeout';
    }

    setupContentProtection() {
        // Prevent iframe embedding
        if (window.top !== window.self) {
            window.top.location = window.self.location;
        }

        // Disable print screen (limited effectiveness)
        document.addEventListener('keyup', (e) => {
            if (e.key === 'PrintScreen') {
                this.logSecurityEvent('PRINT_SCREEN_ATTEMPT', {
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Watermark sensitive content
        this.addWatermark();
    }

    addWatermark() {
        const watermark = document.createElement('div');
        watermark.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 48px;
            color: rgba(46, 112, 229, 0.1);
            pointer-events: none;
            z-index: 9998;
            user-select: none;
            font-weight: bold;
        `;
        watermark.textContent = 'NEXORASIM CONFIDENTIAL';
        document.body.appendChild(watermark);
    }

    setupRateLimit() {
        this.requestCounts = new Map();
        this.rateLimits = {
            login: { max: 5, window: 15 * 60 * 1000 }, // 5 attempts per 15 minutes
            api: { max: 100, window: 60 * 1000 }, // 100 requests per minute
            search: { max: 20, window: 60 * 1000 } // 20 searches per minute
        };
    }

    checkRateLimit(action, identifier = 'default') {
        const key = `${action}:${identifier}`;
        const now = Date.now();
        const limit = this.rateLimits[action];
        
        if (!limit) return true;

        if (!this.requestCounts.has(key)) {
            this.requestCounts.set(key, []);
        }

        const requests = this.requestCounts.get(key);
        
        // Remove old requests outside the window
        const validRequests = requests.filter(time => now - time < limit.window);
        
        if (validRequests.length >= limit.max) {
            this.logSecurityEvent('RATE_LIMIT_EXCEEDED', {
                action,
                identifier,
                count: validRequests.length,
                limit: limit.max
            });
            return false;
        }

        validRequests.push(now);
        this.requestCounts.set(key, validRequests);
        return true;
    }

    logSecurityEvent(event, data = {}) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            event,
            data,
            userAgent: navigator.userAgent,
            url: window.location.href,
            sessionId: this.getSessionId()
        };

        // Send to security logging endpoint
        this.sendSecurityLog(logEntry);
        
        // Store locally for debugging (non-production)
        if (!this.isProduction()) {
            console.warn('Security Event:', logEntry);
        }
    }

    sendSecurityLog(logEntry) {
        fetch('/api/security/log', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': this.csrfToken
            },
            body: JSON.stringify(logEntry)
        }).catch(error => {
            // Fail silently in production
            if (!this.isProduction()) {
                console.error('Failed to send security log:', error);
            }
        });
    }

    getSessionId() {
        return sessionStorage.getItem('sessionId') || 'anonymous';
    }

    clearSensitiveData() {
        // Clear all storage
        localStorage.clear();
        sessionStorage.clear();
        
        // Clear cookies
        document.cookie.split(";").forEach(cookie => {
            const eqPos = cookie.indexOf("=");
            const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
            document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
        });
    }

    isProduction() {
        return window.location.hostname !== 'localhost' && 
               window.location.hostname !== '127.0.0.1' &&
               !window.location.hostname.includes('dev');
    }

    // API Security Methods
    encryptData(data, key) {
        // Simple encryption for demonstration
        // In production, use proper encryption libraries
        return btoa(JSON.stringify(data));
    }

    decryptData(encryptedData, key) {
        try {
            return JSON.parse(atob(encryptedData));
        } catch (error) {
            this.logSecurityEvent('DECRYPTION_ERROR', { error: error.message });
            return null;
        }
    }

    validateInput(input, type) {
        const patterns = {
            email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            phone: /^\+?[\d\s\-\(\)]+$/,
            iccid: /^[0-9]{19,20}$/,
            alphanumeric: /^[a-zA-Z0-9\s]+$/
        };

        if (!patterns[type]) {
            return false;
        }

        return patterns[type].test(input);
    }

    // Secure API wrapper
    secureApiCall(endpoint, options = {}) {
        if (!this.checkRateLimit('api')) {
            throw new Error('Rate limit exceeded');
        }

        const secureOptions = {
            ...options,
            headers: {
                ...options.headers,
                'X-CSRF-Token': this.csrfToken,
                'X-Requested-With': 'XMLHttpRequest',
                'Content-Type': 'application/json'
            }
        };

        return fetch(endpoint, secureOptions)
            .then(response => {
                if (!response.ok) {
                    this.logSecurityEvent('API_ERROR', {
                        endpoint,
                        status: response.status,
                        statusText: response.statusText
                    });
                    throw new Error(`API Error: ${response.status}`);
                }
                return response.json();
            })
            .catch(error => {
                this.logSecurityEvent('API_FAILURE', {
                    endpoint,
                    error: error.message
                });
                throw error;
            });
    }
}

// Initialize security manager
const securityManager = new SecurityManager();

// Export for use in other modules
window.SecurityManager = securityManager;