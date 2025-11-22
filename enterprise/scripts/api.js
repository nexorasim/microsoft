// NexoraSIM Enterprise API Management
'use strict';

class APIManager {
    constructor() {
        this.baseURL = this.getBaseURL();
        this.endpoints = this.initializeEndpoints();
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
        this.retryAttempts = 3;
        this.retryDelay = 1000; // 1 second
        
        this.init();
    }

    init() {
        this.setupInterceptors();
        this.setupOfflineHandling();
        this.setupCacheManagement();
    }

    getBaseURL() {
        const hostname = window.location.hostname;
        const protocol = window.location.protocol;
        
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return `${protocol}//localhost:3000/api`;
        }
        
        return `${protocol}//${hostname}/api`;
    }

    initializeEndpoints() {
        return {
            // Authentication endpoints
            auth: {
                login: '/auth/login',
                logout: '/auth/logout',
                refresh: '/auth/refresh',
                validate: '/auth/validate',
                mfa: '/auth/mfa'
            },
            
            // User management endpoints
            users: {
                list: '/users',
                create: '/users',
                get: (id) => `/users/${id}`,
                update: (id) => `/users/${id}`,
                delete: (id) => `/users/${id}`,
                permissions: (id) => `/users/${id}/permissions`,
                esims: (id) => `/users/${id}/esims`
            },
            
            // eSIM management endpoints
            esims: {
                list: '/esims',
                create: '/esims',
                get: (iccid) => `/esims/${iccid}`,
                update: (iccid) => `/esims/${iccid}`,
                delete: (iccid) => `/esims/${iccid}`,
                activate: (iccid) => `/esims/${iccid}/activate`,
                suspend: (iccid) => `/esims/${iccid}/suspend`,
                qr: (iccid) => `/esims/${iccid}/qr`,
                profile: (iccid) => `/esims/${iccid}/profile`
            },
            
            // Device management endpoints
            devices: {
                list: '/devices',
                enroll: '/devices/enroll',
                get: (id) => `/devices/${id}`,
                update: (id) => `/devices/${id}`,
                delete: (id) => `/devices/${id}`,
                mdm: (id) => `/devices/${id}/mdm`,
                compliance: (id) => `/devices/${id}/compliance`
            },
            
            // Carrier endpoints
            carriers: {
                list: '/carriers',
                status: '/carriers/status',
                config: (carrier) => `/carriers/${carrier}/config`,
                smdp: (carrier) => `/carriers/${carrier}/smdp`,
                test: (carrier) => `/carriers/${carrier}/test`
            },
            
            // Audit and logging endpoints
            audit: {
                logs: '/audit/logs',
                export: '/audit/export',
                search: '/audit/search',
                stats: '/audit/stats'
            },
            
            // Dashboard endpoints
            dashboard: {
                stats: '/dashboard/stats',
                activity: '/dashboard/activity',
                charts: '/dashboard/charts'
            },
            
            // Security endpoints
            security: {
                log: '/security/log',
                status: '/security/status',
                scan: '/security/scan',
                report: '/security/report'
            }
        };
    }

    setupInterceptors() {
        // Request interceptor
        const originalFetch = window.fetch;
        window.fetch = async (url, options = {}) => {
            // Add authentication headers
            const token = localStorage.getItem('sessionToken');
            if (token) {
                options.headers = {
                    ...options.headers,
                    'Authorization': `Bearer ${token}`,
                    'X-Session-Token': token
                };
            }

            // Add common headers
            options.headers = {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'X-Client-Version': '1.0.0',
                ...options.headers
            };

            // Log API calls
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
                
                return response;
            } catch (error) {
                this.logAPIError(url, error);
                throw error;
            }
        };
    }

    setupOfflineHandling() {
        window.addEventListener('online', () => {
            this.handleOnline();
        });

        window.addEventListener('offline', () => {
            this.handleOffline();
        });
    }

    setupCacheManagement() {
        // Clear expired cache entries every 5 minutes
        setInterval(() => {
            this.clearExpiredCache();
        }, 5 * 60 * 1000);
    }

    // Authentication API methods
    async login(credentials) {
        const response = await this.post(this.endpoints.auth.login, credentials);
        
        if (response.success) {
            this.clearCache(); // Clear cache on new login
        }
        
        return response;
    }

    async logout() {
        const response = await this.post(this.endpoints.auth.logout);
        this.clearCache(); // Clear cache on logout
        return response;
    }

    async refreshToken(refreshToken) {
        return await this.post(this.endpoints.auth.refresh, { refreshToken });
    }

    async validateSession(token) {
        return await this.post(this.endpoints.auth.validate, { token });
    }

    // User management API methods
    async getUsers(params = {}) {
        const cacheKey = `users_${JSON.stringify(params)}`;
        const cached = this.getFromCache(cacheKey);
        
        if (cached) {
            return cached;
        }

        const response = await this.get(this.endpoints.users.list, params);
        this.setCache(cacheKey, response);
        return response;
    }

    async createUser(userData) {
        const response = await this.post(this.endpoints.users.create, userData);
        this.invalidateCache('users_'); // Invalidate user cache
        return response;
    }

    async updateUser(userId, userData) {
        const response = await this.put(this.endpoints.users.update(userId), userData);
        this.invalidateCache('users_'); // Invalidate user cache
        return response;
    }

    async deleteUser(userId) {
        const response = await this.delete(this.endpoints.users.delete(userId));
        this.invalidateCache('users_'); // Invalidate user cache
        return response;
    }

    async getUserEsims(userId) {
        const cacheKey = `user_esims_${userId}`;
        const cached = this.getFromCache(cacheKey);
        
        if (cached) {
            return cached;
        }

        const response = await this.get(this.endpoints.users.esims(userId));
        this.setCache(cacheKey, response);
        return response;
    }

    // eSIM management API methods
    async getEsims(params = {}) {
        const cacheKey = `esims_${JSON.stringify(params)}`;
        const cached = this.getFromCache(cacheKey);
        
        if (cached) {
            return cached;
        }

        const response = await this.get(this.endpoints.esims.list, params);
        this.setCache(cacheKey, response);
        return response;
    }

    async createEsim(esimData) {
        const response = await this.post(this.endpoints.esims.create, esimData);
        this.invalidateCache('esims_'); // Invalidate eSIM cache
        return response;
    }

    async updateEsim(iccid, esimData) {
        const response = await this.put(this.endpoints.esims.update(iccid), esimData);
        this.invalidateCache('esims_'); // Invalidate eSIM cache
        return response;
    }

    async activateEsim(iccid) {
        const response = await this.post(this.endpoints.esims.activate(iccid));
        this.invalidateCache('esims_'); // Invalidate eSIM cache
        return response;
    }

    async suspendEsim(iccid) {
        const response = await this.post(this.endpoints.esims.suspend(iccid));
        this.invalidateCache('esims_'); // Invalidate eSIM cache
        return response;
    }

    async deleteEsim(iccid) {
        const response = await this.delete(this.endpoints.esims.delete(iccid));
        this.invalidateCache('esims_'); // Invalidate eSIM cache
        return response;
    }

    async getEsimQR(iccid) {
        return await this.get(this.endpoints.esims.qr(iccid));
    }

    async getEsimProfile(iccid) {
        const cacheKey = `esim_profile_${iccid}`;
        const cached = this.getFromCache(cacheKey);
        
        if (cached) {
            return cached;
        }

        const response = await this.get(this.endpoints.esims.profile(iccid));
        this.setCache(cacheKey, response, 10 * 60 * 1000); // Cache for 10 minutes
        return response;
    }

    // Device management API methods
    async getDevices(params = {}) {
        const cacheKey = `devices_${JSON.stringify(params)}`;
        const cached = this.getFromCache(cacheKey);
        
        if (cached) {
            return cached;
        }

        const response = await this.get(this.endpoints.devices.list, params);
        this.setCache(cacheKey, response);
        return response;
    }

    async enrollDevice(deviceData) {
        const response = await this.post(this.endpoints.devices.enroll, deviceData);
        this.invalidateCache('devices_'); // Invalidate device cache
        return response;
    }

    async updateDevice(deviceId, deviceData) {
        const response = await this.put(this.endpoints.devices.update(deviceId), deviceData);
        this.invalidateCache('devices_'); // Invalidate device cache
        return response;
    }

    async deleteDevice(deviceId) {
        const response = await this.delete(this.endpoints.devices.delete(deviceId));
        this.invalidateCache('devices_'); // Invalidate device cache
        return response;
    }

    // Carrier API methods
    async getCarriers() {
        const cacheKey = 'carriers';
        const cached = this.getFromCache(cacheKey);
        
        if (cached) {
            return cached;
        }

        const response = await this.get(this.endpoints.carriers.list);
        this.setCache(cacheKey, response, 30 * 60 * 1000); // Cache for 30 minutes
        return response;
    }

    async getCarrierStatus() {
        return await this.get(this.endpoints.carriers.status);
    }

    async testCarrierConnection(carrier) {
        return await this.post(this.endpoints.carriers.test(carrier));
    }

    // Dashboard API methods
    async getDashboardStats() {
        const cacheKey = 'dashboard_stats';
        const cached = this.getFromCache(cacheKey);
        
        if (cached) {
            return cached;
        }

        const response = await this.get(this.endpoints.dashboard.stats);
        this.setCache(cacheKey, response, 2 * 60 * 1000); // Cache for 2 minutes
        return response;
    }

    async getDashboardActivity() {
        return await this.get(this.endpoints.dashboard.activity);
    }

    // Audit API methods
    async getAuditLogs(params = {}) {
        return await this.get(this.endpoints.audit.logs, params);
    }

    async exportAuditLogs(params = {}) {
        return await this.get(this.endpoints.audit.export, params);
    }

    async searchAuditLogs(query) {
        return await this.post(this.endpoints.audit.search, { query });
    }

    // Security API methods
    async logSecurityEvent(event) {
        return await this.post(this.endpoints.security.log, event);
    }

    async getSecurityStatus() {
        return await this.get(this.endpoints.security.status);
    }

    // Core HTTP methods
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
            const searchParams = new URLSearchParams(params);
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
        
        if (!cached) {
            return null;
        }
        
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

    clearExpiredCache() {
        const now = Date.now();
        
        for (const [key, cached] of this.cache.entries()) {
            if (now - cached.timestamp > cached.timeout) {
                this.cache.delete(key);
            }
        }
    }

    // Event handlers
    handleAuthenticationError() {
        // Clear session and redirect to login
        localStorage.removeItem('sessionToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('tokenExpiry');
        
        if (window.AuthManager) {
            window.AuthManager.handleLogout();
        }
    }

    handleOnline() {
        console.log('Connection restored');
        // Retry failed requests or sync offline data
        this.syncOfflineData();
    }

    handleOffline() {
        console.log('Connection lost');
        // Show offline notification
        if (window.PortalManager) {
            window.PortalManager.showNotification('Connection lost. Working offline.', 'warning');
        }
    }

    async syncOfflineData() {
        // Implementation for syncing offline data when connection is restored
        console.log('Syncing offline data...');
    }

    // Logging methods
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
        
        // Send error to logging service
        this.logSecurityEvent({
            type: 'API_ERROR',
            url,
            error: error.message,
            timestamp: new Date().toISOString()
        }).catch(() => {
            // Fail silently if logging service is unavailable
        });
    }

    isDebugMode() {
        return localStorage.getItem('debug') === 'true' || 
               window.location.hostname === 'localhost';
    }

    // Utility methods
    formatError(error) {
        if (typeof error === 'string') {
            return error;
        }
        
        if (error.message) {
            return error.message;
        }
        
        return 'An unexpected error occurred';
    }

    isOnline() {
        return navigator.onLine;
    }
}

// Initialize API manager
const apiManager = new APIManager();

// Export for use in other modules
window.APIManager = apiManager;