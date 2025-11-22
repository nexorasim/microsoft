// Premium API Client - Secure & Validated
'use strict';

class PremiumAPIClient {
    constructor() {
        this.baseURL = this.getBaseURL();
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
        this.retryAttempts = 3;
        this.retryDelay = 1000;
        this.init();
    }

    init() {
        this.setupInterceptors();
        this.setupOfflineHandling();
    }

    getBaseURL() {
        const hostname = window.location.hostname;
        const protocol = window.location.protocol;
        
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return `${protocol}//localhost:3000/api`;
        }
        
        return `${protocol}//${hostname}/api`;
    }

    setupInterceptors() {
        const originalFetch = window.fetch;
        window.fetch = async (url, options = {}) => {
            // Add authentication and security headers
            const token = window.PremiumAuth?.sessionToken;
            if (token) {
                options.headers = {
                    ...options.headers,
                    'Authorization': `Bearer ${token}`,
                    'X-Session-Token': token
                };
            }

            // Add security headers
            options.headers = {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'X-Client-Version': '1.0.0',
                ...options.headers
            };

            // Log API calls for audit
            this.logAPICall(url, options);

            try {
                const response = await originalFetch(url, options);
                
                // Handle authentication errors
                if (response.status === 401) {
                    this.handleAuthenticationError();
                    throw new Error('Authentication required');
                }
                
                // Handle rate limiting
                if (response.status === 429) {
                    const retryAfter = response.headers.get('Retry-After') || 60;
                    throw new Error(`Rate limited. Retry after ${retryAfter} seconds`);
                }
                
                // Handle server errors
                if (response.status >= 500) {
                    throw new Error(`Server error: ${response.status}`);
                }
                
                return response;
            } catch (error) {
                this.logAPIError(url, error);
                throw error;
            }
        };
    }

    setupOfflineHandling() {
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
    }

    // Authentication API
    async login(credentials) {
        const sanitizedCredentials = {
            email: window.PremiumSecurity.sanitizeInput(credentials.email),
            password: credentials.password, // Don't sanitize password
            mfaCode: window.PremiumSecurity.sanitizeInput(credentials.mfaCode || ''),
            deviceFingerprint: credentials.deviceFingerprint
        };

        return await this.post('/auth/login', sanitizedCredentials);
    }

    async logout() {
        return await this.post('/auth/logout');
    }

    async refreshToken(refreshToken) {
        return await this.post('/auth/refresh', { refreshToken });
    }

    async validateSession(token) {
        return await this.post('/auth/validate', { token });
    }

    // User Management API
    async getUsers(params = {}) {
        const cacheKey = `users_${JSON.stringify(params)}`;
        const cached = this.getFromCache(cacheKey);
        
        if (cached) return cached;

        const response = await this.get('/users', params);
        this.setCache(cacheKey, response);
        return response;
    }

    async createUser(userData) {
        const sanitizedData = {
            name: window.PremiumSecurity.sanitizeInput(userData.name),
            email: window.PremiumSecurity.sanitizeInput(userData.email),
            role: window.PremiumSecurity.sanitizeInput(userData.role)
        };

        // Validate input
        if (!window.PremiumSecurity.validateInput(sanitizedData.email, 'email')) {
            throw new Error('Invalid email format');
        }

        if (!['admin', 'operator', 'user'].includes(sanitizedData.role)) {
            throw new Error('Invalid role');
        }

        const response = await this.post('/users', sanitizedData);
        this.invalidateCache('users_');
        return response;
    }

    async updateUser(userId, userData) {
        const sanitizedData = {
            name: window.PremiumSecurity.sanitizeInput(userData.name),
            email: window.PremiumSecurity.sanitizeInput(userData.email),
            role: window.PremiumSecurity.sanitizeInput(userData.role)
        };

        const response = await this.put(`/users/${userId}`, sanitizedData);
        this.invalidateCache('users_');
        return response;
    }

    async deleteUser(userId) {
        const response = await this.delete(`/users/${userId}`);
        this.invalidateCache('users_');
        return response;
    }

    // eSIM Management API
    async getESIMs(params = {}) {
        const cacheKey = `esims_${JSON.stringify(params)}`;
        const cached = this.getFromCache(cacheKey);
        
        if (cached) return cached;

        const response = await this.get('/esims', params);
        this.setCache(cacheKey, response);
        return response;
    }

    async uploadESIMs(esimData) {
        // Validate eSIM data
        const validatedData = esimData.map(esim => {
            if (!window.PremiumSecurity.validateInput(esim.iccid, 'iccid')) {
                throw new Error(`Invalid ICCID: ${esim.iccid}`);
            }

            if (!['MPT', 'ATOM', 'U9', 'MYTEL'].includes(esim.carrier)) {
                throw new Error(`Invalid carrier: ${esim.carrier}`);
            }

            return {
                iccid: window.PremiumSecurity.sanitizeInput(esim.iccid),
                carrier: window.PremiumSecurity.sanitizeInput(esim.carrier),
                status: 'Inactive',
                assignedUser: null,
                device: null
            };
        });

        const response = await this.post('/esims/bulk', { esims: validatedData });
        this.invalidateCache('esims_');
        return response;
    }

    async assignESIM(iccid, userId) {
        const response = await this.put(`/esims/${iccid}/assign`, { userId });
        this.invalidateCache('esims_');
        return response;
    }

    async activateESIM(iccid) {
        const response = await this.post(`/esims/${iccid}/activate`);
        this.invalidateCache('esims_');
        return response;
    }

    async suspendESIM(iccid) {
        const response = await this.post(`/esims/${iccid}/suspend`);
        this.invalidateCache('esims_');
        return response;
    }

    // Device Management API
    async getDevices(params = {}) {
        return await this.get('/devices', params);
    }

    async enrollDevice(deviceData) {
        const sanitizedData = {
            serialNumber: window.PremiumSecurity.sanitizeInput(deviceData.serialNumber),
            model: window.PremiumSecurity.sanitizeInput(deviceData.model),
            platform: window.PremiumSecurity.sanitizeInput(deviceData.platform),
            userId: window.PremiumSecurity.sanitizeInput(deviceData.userId)
        };

        return await this.post('/devices/enroll', sanitizedData);
    }

    // Carrier API
    async getCarrierStatus() {
        const cacheKey = 'carrier_status';
        const cached = this.getFromCache(cacheKey);
        
        if (cached) return cached;

        const response = await this.get('/carriers/status');
        this.setCache(cacheKey, response, 2 * 60 * 1000); // Cache for 2 minutes
        return response;
    }

    async testCarrierConnection(carrier) {
        return await this.post(`/carriers/${carrier}/test`);
    }

    // Dashboard API
    async getDashboardStats() {
        const cacheKey = 'dashboard_stats';
        const cached = this.getFromCache(cacheKey);
        
        if (cached) return cached;

        const response = await this.get('/dashboard/stats');
        this.setCache(cacheKey, response, 1 * 60 * 1000); // Cache for 1 minute
        return response;
    }

    // Audit API
    async getAuditLogs(params = {}) {
        return await this.get('/audit/logs', params);
    }

    async exportAuditLogs(params = {}) {
        return await this.get('/audit/export', params);
    }

    // Security API
    async logSecurityEvent(event) {
        return await this.post('/security/log', event);
    }

    async getSecurityStatus() {
        return await this.get('/security/status');
    }

    // Core HTTP methods with retry logic
    async get(endpoint, params = {}) {
        const url = this.buildURL(endpoint, params);
        return await this.makeRequest(url, { method: 'GET' });
    }

    async post(endpoint, data = {}) {
        const url = this.buildURL(endpoint);
        return await this.makeRequest(url, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async put(endpoint, data = {}) {
        const url = this.buildURL(endpoint);
        return await this.makeRequest(url, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async delete(endpoint) {
        const url = this.buildURL(endpoint);
        return await this.makeRequest(url, { method: 'DELETE' });
    }

    async makeRequest(url, options = {}) {
        let lastError;
        
        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                const response = await fetch(url, options);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                return data;
                
            } catch (error) {
                lastError = error;
                
                // Don't retry on authentication errors
                if (error.message.includes('401')) {
                    break;
                }
                
                if (attempt < this.retryAttempts) {
                    await this.delay(this.retryDelay * attempt);
                    continue;
                }
                
                break;
            }
        }
        
        throw lastError;
    }

    buildURL(endpoint, params = {}) {
        let url = `${this.baseURL}${endpoint}`;
        
        if (Object.keys(params).length > 0) {
            const searchParams = new URLSearchParams();
            Object.entries(params).forEach(([key, value]) => {
                if (value !== null && value !== undefined) {
                    searchParams.append(key, value);
                }
            });
            url += `?${searchParams.toString()}`;
        }
        
        return url;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Cache management
    setCache(key, data, timeout = this.cacheTimeout) {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            timeout
        });
    }

    getFromCache(key) {
        const cached = this.cache.get(key);
        
        if (!cached) return null;
        
        if (Date.now() - cached.timestamp > cached.timeout) {
            this.cache.delete(key);
            return null;
        }
        
        return cached.data;
    }

    invalidateCache(prefix) {
        for (const key of this.cache.keys()) {
            if (key.startsWith(prefix)) {
                this.cache.delete(key);
            }
        }
    }

    clearCache() {
        this.cache.clear();
    }

    // Event handlers
    handleAuthenticationError() {
        if (window.PremiumAuth) {
            window.PremiumAuth.handleLogout();
        }
    }

    handleOnline() {
        console.log('Connection restored');
        if (window.PremiumPortal) {
            window.PremiumPortal.showNotification('Connection restored', 'success');
        }
    }

    handleOffline() {
        console.log('Connection lost');
        if (window.PremiumPortal) {
            window.PremiumPortal.showNotification('Connection lost. Working offline.', 'warning');
        }
    }

    // Logging
    logAPICall(url, options) {
        if (this.isDebugMode()) {
            console.log('API Call:', {
                url,
                method: options.method || 'GET',
                timestamp: new Date().toISOString()
            });
        }
    }

    logAPIError(url, error) {
        console.error('API Error:', {
            url,
            error: error.message,
            timestamp: new Date().toISOString()
        });
        
        // Send to security logging
        if (window.PremiumSecurity) {
            window.PremiumSecurity.logSecurityEvent('API_ERROR', {
                url,
                error: error.message
            });
        }
    }

    isDebugMode() {
        return localStorage.getItem('debug') === 'true' || 
               window.location.hostname === 'localhost';
    }

    // Utility methods
    isOnline() {
        return navigator.onLine;
    }

    formatError(error) {
        if (typeof error === 'string') return error;
        if (error.message) return error.message;
        return 'An unexpected error occurred';
    }
}

// Initialize API client
const premiumAPIClient = new PremiumAPIClient();

// Export for global access
window.PremiumAPIClient = premiumAPIClient;