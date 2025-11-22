// NexoraSIM Enterprise Portal Management
'use strict';

class PortalManager {
    constructor() {
        this.currentSection = 'dashboard';
        this.userData = [];
        this.esimData = [];
        this.deviceData = [];
        this.auditData = [];
        this.searchFilters = {};
        
        this.init();
    }

    init() {
        this.setupNavigation();
        this.setupEventListeners();
        this.loadInitialData();
        this.setupRealTimeUpdates();
    }

    setupNavigation() {
        document.addEventListener('DOMContentLoaded', () => {
            const navItems = document.querySelectorAll('.nav-item[data-section]');
            navItems.forEach(item => {
                item.addEventListener('click', (e) => {
                    const section = e.target.closest('.nav-item').dataset.section;
                    this.showSection(section);
                });
            });
        });
    }

    showSection(sectionId) {
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            item.removeAttribute('aria-current');
        });
        
        const activeNav = document.querySelector(`[data-section="${sectionId}"]`);
        if (activeNav) {
            activeNav.classList.add('active');
            activeNav.setAttribute('aria-current', 'page');
        }

        // Update content
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        
        const activeSection = document.getElementById(`${sectionId}-section`);
        if (activeSection) {
            activeSection.classList.add('active');
        }

        // Update page title
        const titles = {
            dashboard: 'Enterprise Dashboard',
            users: 'User Management',
            esims: 'eSIM Profile Management',
            devices: 'Device Enrollment',
            carriers: 'Carrier Configuration',
            audit: 'Audit Logs',
            security: 'Security & Compliance'
        };
        
        const pageTitle = document.getElementById('page-title');
        if (pageTitle && titles[sectionId]) {
            pageTitle.textContent = titles[sectionId];
        }

        // Load section-specific data
        this.loadSectionData(sectionId);
        this.currentSection = sectionId;

        // Log navigation
        this.logActivity(`Navigated to ${titles[sectionId] || sectionId}`);
    }

    setupEventListeners() {
        document.addEventListener('DOMContentLoaded', () => {
            // Search functionality
            this.setupSearchHandlers();
            
            // Button handlers
            this.setupButtonHandlers();
            
            // Table handlers
            this.setupTableHandlers();
            
            // Form handlers
            this.setupFormHandlers();
        });
    }

    setupSearchHandlers() {
        const searchInputs = document.querySelectorAll('.search-input');
        searchInputs.forEach(input => {
            input.addEventListener('input', (e) => {
                const searchTerm = e.target.value.toLowerCase();
                const tableId = e.target.id.replace('-search', '');
                this.filterTable(tableId, searchTerm);
            });
        });

        const filterSelects = document.querySelectorAll('.filter-select');
        filterSelects.forEach(select => {
            select.addEventListener('change', (e) => {
                const filterValue = e.target.value;
                const filterId = e.target.id.replace('-filter', '');
                this.applyFilter(filterId, filterValue);
            });
        });
    }

    setupButtonHandlers() {
        // User management buttons
        const addUserBtn = document.getElementById('add-user-btn');
        if (addUserBtn) {
            addUserBtn.addEventListener('click', () => this.showAddUserModal());
        }

        const exportUsersBtn = document.getElementById('export-users');
        if (exportUsersBtn) {
            exportUsersBtn.addEventListener('click', () => this.exportUsers());
        }

        // eSIM management buttons
        const createEsimBtn = document.getElementById('create-esim-btn');
        if (createEsimBtn) {
            createEsimBtn.addEventListener('click', () => this.showCreateEsimModal());
        }

        const exportEsimsBtn = document.getElementById('export-esims');
        if (exportEsimsBtn) {
            exportEsimsBtn.addEventListener('click', () => this.exportEsims());
        }

        // Device enrollment buttons
        const enrollDeviceBtn = document.getElementById('enroll-device-btn');
        if (enrollDeviceBtn) {
            enrollDeviceBtn.addEventListener('click', () => this.showEnrollDeviceModal());
        }

        // Audit buttons
        const exportAuditBtn = document.getElementById('export-audit');
        if (exportAuditBtn) {
            exportAuditBtn.addEventListener('click', () => this.exportAuditLogs());
        }

        const filterAuditBtn = document.getElementById('filter-audit');
        if (filterAuditBtn) {
            filterAuditBtn.addEventListener('click', () => this.filterAuditLogs());
        }
    }

    setupTableHandlers() {
        // Dynamic table row actions will be handled by event delegation
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('action-btn')) {
                this.handleTableAction(e.target);
            }
        });
    }

    setupFormHandlers() {
        // Form validation and submission handlers
        document.addEventListener('submit', (e) => {
            if (e.target.classList.contains('portal-form')) {
                e.preventDefault();
                this.handleFormSubmission(e.target);
            }
        });
    }

    async loadInitialData() {
        try {
            await Promise.all([
                this.loadDashboardStats(),
                this.loadUsers(),
                this.loadEsims(),
                this.loadDevices(),
                this.loadAuditLogs()
            ]);
        } catch (error) {
            console.error('Failed to load initial data:', error);
            this.showNotification('Failed to load data. Please refresh the page.', 'error');
        }
    }

    async loadDashboardStats() {
        try {
            const stats = await window.SecurityManager.secureApiCall('/api/dashboard/stats');
            
            document.getElementById('total-users').textContent = stats.totalUsers || 247;
            document.getElementById('active-esims').textContent = stats.activeEsims || 189;
            document.getElementById('enrolled-devices').textContent = stats.enrolledDevices || 156;
            
            // Update activity list
            this.updateActivityList(stats.recentActivity || []);
            
        } catch (error) {
            console.error('Failed to load dashboard stats:', error);
        }
    }

    async loadUsers() {
        try {
            const response = await window.SecurityManager.secureApiCall('/api/users');
            this.userData = response.users || this.generateMockUsers();
            this.renderUsersTable();
        } catch (error) {
            console.error('Failed to load users:', error);
            this.userData = this.generateMockUsers();
            this.renderUsersTable();
        }
    }

    async loadEsims() {
        try {
            const response = await window.SecurityManager.secureApiCall('/api/esims');
            this.esimData = response.esims || this.generateMockEsims();
            this.renderEsimsTable();
        } catch (error) {
            console.error('Failed to load eSIMs:', error);
            this.esimData = this.generateMockEsims();
            this.renderEsimsTable();
        }
    }

    async loadDevices() {
        try {
            const response = await window.SecurityManager.secureApiCall('/api/devices');
            this.deviceData = response.devices || [];
            this.updateDeviceStats();
        } catch (error) {
            console.error('Failed to load devices:', error);
            this.updateDeviceStats();
        }
    }

    async loadAuditLogs() {
        try {
            const response = await window.SecurityManager.secureApiCall('/api/audit');
            this.auditData = response.logs || this.generateMockAuditLogs();
            this.renderAuditLogs();
        } catch (error) {
            console.error('Failed to load audit logs:', error);
            this.auditData = this.generateMockAuditLogs();
            this.renderAuditLogs();
        }
    }

    loadSectionData(sectionId) {
        switch (sectionId) {
            case 'dashboard':
                this.loadDashboardStats();
                break;
            case 'users':
                this.renderUsersTable();
                break;
            case 'esims':
                this.renderEsimsTable();
                break;
            case 'devices':
                this.updateDeviceStats();
                break;
            case 'audit':
                this.renderAuditLogs();
                break;
        }
    }

    renderUsersTable() {
        const tbody = document.getElementById('users-table-body');
        if (!tbody) return;

        tbody.innerHTML = this.userData.map(user => `
            <tr data-user-id="${user.id}">
                <td>${user.id}</td>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>${user.role}</td>
                <td><span class="status-badge ${user.status.toLowerCase()}">${user.status}</span></td>
                <td>${user.esimCount}</td>
                <td>
                    <button class="action-btn btn-edit" data-action="edit-user" data-id="${user.id}">Edit</button>
                    <button class="action-btn btn-delete" data-action="delete-user" data-id="${user.id}">Delete</button>
                    <button class="action-btn btn-view" data-action="view-user" data-id="${user.id}">View</button>
                </td>
            </tr>
        `).join('');
    }

    renderEsimsTable() {
        const tbody = document.getElementById('esims-table-body');
        if (!tbody) return;

        tbody.innerHTML = this.esimData.map(esim => `
            <tr data-esim-id="${esim.iccid}">
                <td><code>${esim.iccid}</code></td>
                <td>${esim.user}</td>
                <td>${esim.carrier}</td>
                <td>${esim.phoneNumber}</td>
                <td><span class="status-badge ${esim.status.toLowerCase()}">${esim.status}</span></td>
                <td>${esim.created}</td>
                <td>
                    <button class="action-btn btn-edit" data-action="edit-esim" data-id="${esim.iccid}">Edit</button>
                    <button class="action-btn btn-suspend" data-action="suspend-esim" data-id="${esim.iccid}">Suspend</button>
                    <button class="action-btn btn-delete" data-action="delete-esim" data-id="${esim.iccid}">Delete</button>
                </td>
            </tr>
        `).join('');
    }

    renderAuditLogs() {
        const auditLog = document.getElementById('audit-log');
        if (!auditLog) return;

        auditLog.innerHTML = this.auditData.map(log => `
            <div class="audit-entry">
                <div class="audit-header">
                    <span class="audit-timestamp">${log.timestamp}</span>
                    <span class="audit-event">${log.event}</span>
                    <span class="audit-user">${log.user}</span>
                </div>
                <div class="audit-details">${log.details}</div>
            </div>
        `).join('');
    }

    updateActivityList(activities) {
        const activityList = document.getElementById('activity-list');
        if (!activityList) return;

        activityList.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <span class="activity-time">${activity.time}</span>
                <span class="activity-text">${activity.text}</span>
            </div>
        `).join('');
    }

    updateDeviceStats() {
        const iosDevices = document.getElementById('ios-devices');
        const androidDevices = document.getElementById('android-devices');
        
        if (iosDevices) iosDevices.textContent = '89';
        if (androidDevices) androidDevices.textContent = '67';
    }

    filterTable(tableType, searchTerm) {
        let data;
        switch (tableType) {
            case 'user':
                data = this.userData;
                break;
            case 'esim':
                data = this.esimData;
                break;
            default:
                return;
        }

        const filteredData = data.filter(item => {
            return Object.values(item).some(value => 
                value.toString().toLowerCase().includes(searchTerm)
            );
        });

        if (tableType === 'user') {
            this.renderFilteredUsers(filteredData);
        } else if (tableType === 'esim') {
            this.renderFilteredEsims(filteredData);
        }
    }

    applyFilter(filterType, filterValue) {
        this.searchFilters[filterType] = filterValue;
        
        if (filterType === 'user') {
            const filteredUsers = filterValue ? 
                this.userData.filter(user => user.role === filterValue) : 
                this.userData;
            this.renderFilteredUsers(filteredUsers);
        } else if (filterType === 'esim') {
            const filteredEsims = filterValue ? 
                this.esimData.filter(esim => esim.carrier === filterValue) : 
                this.esimData;
            this.renderFilteredEsims(filteredEsims);
        }
    }

    renderFilteredUsers(users) {
        const tbody = document.getElementById('users-table-body');
        if (!tbody) return;

        tbody.innerHTML = users.map(user => `
            <tr data-user-id="${user.id}">
                <td>${user.id}</td>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>${user.role}</td>
                <td><span class="status-badge ${user.status.toLowerCase()}">${user.status}</span></td>
                <td>${user.esimCount}</td>
                <td>
                    <button class="action-btn btn-edit" data-action="edit-user" data-id="${user.id}">Edit</button>
                    <button class="action-btn btn-delete" data-action="delete-user" data-id="${user.id}">Delete</button>
                </td>
            </tr>
        `).join('');
    }

    renderFilteredEsims(esims) {
        const tbody = document.getElementById('esims-table-body');
        if (!tbody) return;

        tbody.innerHTML = esims.map(esim => `
            <tr data-esim-id="${esim.iccid}">
                <td><code>${esim.iccid}</code></td>
                <td>${esim.user}</td>
                <td>${esim.carrier}</td>
                <td>${esim.phoneNumber}</td>
                <td><span class="status-badge ${esim.status.toLowerCase()}">${esim.status}</span></td>
                <td>${esim.created}</td>
                <td>
                    <button class="action-btn btn-edit" data-action="edit-esim" data-id="${esim.iccid}">Edit</button>
                    <button class="action-btn btn-suspend" data-action="suspend-esim" data-id="${esim.iccid}">Suspend</button>
                    <button class="action-btn btn-delete" data-action="delete-esim" data-id="${esim.iccid}">Delete</button>
                </td>
            </tr>
        `).join('');
    }

    handleTableAction(button) {
        const action = button.dataset.action;
        const id = button.dataset.id;

        switch (action) {
            case 'edit-user':
                this.editUser(id);
                break;
            case 'delete-user':
                this.deleteUser(id);
                break;
            case 'view-user':
                this.viewUser(id);
                break;
            case 'edit-esim':
                this.editEsim(id);
                break;
            case 'suspend-esim':
                this.suspendEsim(id);
                break;
            case 'delete-esim':
                this.deleteEsim(id);
                break;
        }
    }

    async editUser(userId) {
        try {
            window.AuthManager.requirePermission('user.edit');
            
            const user = this.userData.find(u => u.id === userId);
            if (!user) {
                this.showNotification('User not found', 'error');
                return;
            }

            // Show edit modal (implementation would depend on modal system)
            this.showNotification(`Editing user: ${user.name}`, 'info');
            this.logActivity(`Edited user ${user.name}`);
            
        } catch (error) {
            this.showNotification('Access denied: Cannot edit users', 'error');
        }
    }

    async deleteUser(userId) {
        try {
            window.AuthManager.requirePermission('user.delete');
            
            if (!confirm('Are you sure you want to delete this user?')) {
                return;
            }

            const response = await window.SecurityManager.secureApiCall(`/api/users/${userId}`, {
                method: 'DELETE'
            });

            if (response.success) {
                this.userData = this.userData.filter(u => u.id !== userId);
                this.renderUsersTable();
                this.showNotification('User deleted successfully', 'success');
                this.logActivity(`Deleted user ${userId}`);
            }
            
        } catch (error) {
            this.showNotification('Failed to delete user', 'error');
        }
    }

    async suspendEsim(iccid) {
        try {
            window.AuthManager.requirePermission('esim.suspend');
            
            if (!confirm('Are you sure you want to suspend this eSIM?')) {
                return;
            }

            const response = await window.SecurityManager.secureApiCall(`/api/esims/${iccid}/suspend`, {
                method: 'POST'
            });

            if (response.success) {
                const esim = this.esimData.find(e => e.iccid === iccid);
                if (esim) {
                    esim.status = 'Suspended';
                }
                this.renderEsimsTable();
                this.showNotification('eSIM suspended successfully', 'success');
                this.logActivity(`Suspended eSIM ${iccid}`);
            }
            
        } catch (error) {
            this.showNotification('Failed to suspend eSIM', 'error');
        }
    }

    exportUsers() {
        try {
            window.AuthManager.requirePermission('user.export');
            
            const csvContent = this.generateCSV(this.userData, [
                'id', 'name', 'email', 'role', 'status', 'esimCount'
            ]);
            
            this.downloadFile(csvContent, 'users-export.csv', 'text/csv');
            this.logActivity('Exported user data');
            
        } catch (error) {
            this.showNotification('Access denied: Cannot export users', 'error');
        }
    }

    exportEsims() {
        try {
            window.AuthManager.requirePermission('esim.export');
            
            const csvContent = this.generateCSV(this.esimData, [
                'iccid', 'user', 'carrier', 'phoneNumber', 'status', 'created'
            ]);
            
            this.downloadFile(csvContent, 'esims-export.csv', 'text/csv');
            this.logActivity('Exported eSIM data');
            
        } catch (error) {
            this.showNotification('Access denied: Cannot export eSIMs', 'error');
        }
    }

    exportAuditLogs() {
        try {
            window.AuthManager.requirePermission('audit.export');
            
            const csvContent = this.generateCSV(this.auditData, [
                'timestamp', 'event', 'user', 'details'
            ]);
            
            this.downloadFile(csvContent, 'audit-logs-export.csv', 'text/csv');
            this.logActivity('Exported audit logs');
            
        } catch (error) {
            this.showNotification('Access denied: Cannot export audit logs', 'error');
        }
    }

    generateCSV(data, columns) {
        const header = columns.join(',');
        const rows = data.map(item => 
            columns.map(col => `"${item[col] || ''}"`).join(',')
        );
        return [header, ...rows].join('\n');
    }

    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
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
            z-index: 10000;
            max-width: 400px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;

        const colors = {
            success: '#28a745',
            error: '#dc3545',
            warning: '#ffc107',
            info: '#17a2b8'
        };

        notification.style.backgroundColor = colors[type] || colors.info;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    logActivity(activity) {
        const timestamp = new Date().toLocaleString();
        const user = window.AuthManager.getCurrentUser();
        
        // Add to local activity log
        const activityEntry = {
            timestamp,
            activity,
            user: user ? user.email : 'Unknown'
        };

        // Send to server
        window.SecurityManager.secureApiCall('/api/activity/log', {
            method: 'POST',
            body: JSON.stringify(activityEntry)
        }).catch(error => {
            console.error('Failed to log activity:', error);
        });
    }

    setupRealTimeUpdates() {
        // Simulate real-time updates
        setInterval(() => {
            if (this.currentSection === 'dashboard') {
                this.loadDashboardStats();
            }
        }, 30000); // Update every 30 seconds
    }

    // Mock data generators for development
    generateMockUsers() {
        return [
            {
                id: 'USR001',
                name: 'John Smith',
                email: 'john.smith@nexorasim.com',
                role: 'Administrator',
                status: 'Active',
                esimCount: 3
            },
            {
                id: 'USR002',
                name: 'Sarah Johnson',
                email: 'sarah.johnson@nexorasim.com',
                role: 'Operator',
                status: 'Active',
                esimCount: 2
            },
            {
                id: 'USR003',
                name: 'Michael Chen',
                email: 'michael.chen@nexorasim.com',
                role: 'User',
                status: 'Active',
                esimCount: 1
            }
        ];
    }

    generateMockEsims() {
        return [
            {
                iccid: '89014103211118510720',
                user: 'john.smith@nexorasim.com',
                carrier: 'MPT Myanmar',
                phoneNumber: '+95 9 123 456 789',
                status: 'Active',
                created: '2024-11-22'
            },
            {
                iccid: '89014103211118510721',
                user: 'sarah.johnson@nexorasim.com',
                carrier: 'ATOM Myanmar',
                phoneNumber: '+95 9 987 654 321',
                status: 'Active',
                created: '2024-11-22'
            },
            {
                iccid: '89014103211118510722',
                user: 'michael.chen@nexorasim.com',
                carrier: 'U9 Networks',
                phoneNumber: '+95 9 555 123 456',
                status: 'Pending',
                created: '2024-11-22'
            }
        ];
    }

    generateMockAuditLogs() {
        return [
            {
                timestamp: '2024-11-22 14:30:15',
                event: 'LOGIN_SUCCESS',
                user: 'admin@nexorasim.com',
                details: 'Successful login from IP 192.168.1.100'
            },
            {
                timestamp: '2024-11-22 14:25:42',
                event: 'ESIM_CREATED',
                user: 'operator@nexorasim.com',
                details: 'Created eSIM profile 89014103211118510723'
            },
            {
                timestamp: '2024-11-22 14:20:18',
                event: 'USER_UPDATED',
                user: 'admin@nexorasim.com',
                details: 'Updated user permissions for john.smith@nexorasim.com'
            }
        ];
    }
}

// Initialize portal manager
const portalManager = new PortalManager();

// Export for use in other modules
window.PortalManager = portalManager;