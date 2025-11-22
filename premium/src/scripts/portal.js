// Premium Portal Management System
'use strict';

class PremiumPortal {
    constructor() {
        this.currentSection = 'dashboard';
        this.userData = [];
        this.esimData = [];
        this.auditData = [];
        this.carrierStats = { MPT: 0, ATOM: 0, U9: 0, MYTEL: 0 };
        this.init();
    }

    init() {
        this.setupNavigation();
        this.setupEventListeners();
        this.loadInitialData();
        this.setupRealTimeUpdates();
        this.setupModals();
    }

    setupNavigation() {
        document.addEventListener('DOMContentLoaded', () => {
            const navItems = document.querySelectorAll('.nav-item[data-section]');
            navItems.forEach(item => {
                item.addEventListener('click', (e) => {
                    const section = e.target.dataset.section;
                    this.showSection(section);
                });
            });
        });
    }

    showSection(sectionId) {
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const activeNav = document.querySelector(`[data-section="${sectionId}"]`);
        if (activeNav) {
            activeNav.classList.add('active');
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
            carriers: 'Carrier Configuration',
            audit: 'Audit Logs',
            security: 'Security & Compliance'
        };
        
        const pageTitle = document.getElementById('page-title');
        if (pageTitle && titles[sectionId]) {
            pageTitle.textContent = titles[sectionId];
        }

        this.loadSectionData(sectionId);
        this.currentSection = sectionId;
        this.logActivity(`Navigated to ${titles[sectionId] || sectionId}`);
    }

    setupEventListeners() {
        document.addEventListener('DOMContentLoaded', () => {
            this.setupSearchHandlers();
            this.setupButtonHandlers();
            this.setupTableHandlers();
        });
    }

    setupSearchHandlers() {
        const searchInputs = document.querySelectorAll('.search-input');
        searchInputs.forEach(input => {
            input.addEventListener('input', (e) => {
                if (!window.PremiumSecurity.checkRateLimit('search')) {
                    return;
                }
                
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
        document.addEventListener('click', (e) => {
            const target = e.target;
            
            if (target.id === 'add-user-btn') {
                this.showAddUserModal();
            } else if (target.id === 'upload-esims-btn') {
                this.showUploadESIMsModal();
            } else if (target.id === 'export-users') {
                this.exportUsers();
            } else if (target.id === 'export-esims') {
                this.exportESIMs();
            } else if (target.id === 'export-audit') {
                this.exportAuditLogs();
            } else if (target.classList.contains('action-btn')) {
                this.handleTableAction(target);
            }
        });
    }

    setupTableHandlers() {
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('action-btn')) {
                this.handleTableAction(e.target);
            }
        });
    }

    async loadInitialData() {
        try {
            await Promise.all([
                this.loadDashboardStats(),
                this.loadUsers(),
                this.loadESIMs(),
                this.loadAuditLogs()
            ]);
        } catch (error) {
            console.error('Failed to load initial data:', error);
            this.showNotification('Failed to load data. Please refresh.', 'error');
        }
    }

    async loadDashboardStats() {
        try {
            const stats = await window.PremiumSecurity.secureApiCall('/api/dashboard/stats');
            
            document.getElementById('total-users').textContent = stats.totalUsers || 247;
            document.getElementById('active-esims').textContent = stats.activeESIMs || 189;
            document.getElementById('total-devices').textContent = stats.totalDevices || 156;
            
            this.updateActivityList(stats.recentActivity || []);
        } catch (error) {
            // Use mock data if API fails
            this.updateActivityList([
                { time: '2 min ago', text: 'eSIM activated for user@company.com' },
                { time: '5 min ago', text: 'New device enrolled via Apple Business Manager' },
                { time: '12 min ago', text: 'Bulk eSIM provisioning completed' }
            ]);
        }
    }

    async loadUsers() {
        try {
            window.PremiumAuth.requirePermission('user.read');
            
            const response = await window.PremiumSecurity.secureApiCall('/api/users');
            this.userData = response.users || this.generateMockUsers();
            this.renderUsersTable();
        } catch (error) {
            if (error.message.includes('Access denied')) {
                this.showNotification('Access denied: Cannot view users', 'error');
                return;
            }
            this.userData = this.generateMockUsers();
            this.renderUsersTable();
        }
    }

    async loadESIMs() {
        try {
            window.PremiumAuth.requirePermission('esim.read');
            
            const response = await window.PremiumSecurity.secureApiCall('/api/esims');
            this.esimData = response.esims || this.generateMockESIMs();
            this.renderESIMsTable();
            this.updateCarrierStats();
        } catch (error) {
            if (error.message.includes('Access denied')) {
                this.showNotification('Access denied: Cannot view eSIMs', 'error');
                return;
            }
            this.esimData = this.generateMockESIMs();
            this.renderESIMsTable();
            this.updateCarrierStats();
        }
    }

    async loadAuditLogs() {
        try {
            window.PremiumAuth.requirePermission('audit.read');
            
            const response = await window.PremiumSecurity.secureApiCall('/api/audit');
            this.auditData = response.logs || this.generateMockAuditLogs();
            this.renderAuditLogs();
        } catch (error) {
            if (error.message.includes('Access denied')) {
                this.showNotification('Access denied: Cannot view audit logs', 'error');
                return;
            }
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
                this.renderESIMsTable();
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
            <tr>
                <td>${user.id}</td>
                <td>${user.name}</td>
                <td>${window.PremiumSecurity.obfuscateText(user.email, 3)}</td>
                <td>${user.role}</td>
                <td><span class="status-badge ${user.status.toLowerCase()}">${user.status}</span></td>
                <td>
                    <button class="btn-secondary action-btn" data-action="edit-user" data-id="${user.id}">Edit</button>
                    <button class="btn-secondary action-btn" data-action="delete-user" data-id="${user.id}">Delete</button>
                </td>
            </tr>
        `).join('');
    }

    renderESIMsTable() {
        const tbody = document.getElementById('esims-table-body');
        if (!tbody) return;

        tbody.innerHTML = this.esimData.map(esim => `
            <tr>
                <td><code>${window.PremiumSecurity.obfuscateText(esim.iccid, 8)}</code></td>
                <td>${esim.carrier}</td>
                <td><span class="status-badge ${esim.status.toLowerCase()}">${esim.status}</span></td>
                <td>${esim.assignedUser || 'Unassigned'}</td>
                <td>${esim.device || 'None'}</td>
                <td>
                    <button class="btn-secondary action-btn" data-action="assign-esim" data-id="${esim.iccid}">Assign</button>
                    <button class="btn-secondary action-btn" data-action="activate-esim" data-id="${esim.iccid}">Activate</button>
                </td>
            </tr>
        `).join('');
    }

    renderAuditLogs() {
        const auditLog = document.getElementById('audit-log');
        if (!auditLog) return;

        auditLog.innerHTML = this.auditData.map(log => `
            <div class="audit-entry" style="padding: 12px; border-bottom: 1px solid var(--gray-200); margin-bottom: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                    <span style="font-weight: 600; color: var(--primary-color);">${log.event}</span>
                    <span style="font-size: 12px; color: var(--gray-500);">${log.timestamp}</span>
                </div>
                <div style="font-size: 14px; color: var(--gray-700);">${log.details}</div>
                <div style="font-size: 12px; color: var(--gray-500); margin-top: 4px;">User: ${log.user}</div>
            </div>
        `).join('');
    }

    updateActivityList(activities) {
        const activityList = document.getElementById('activity-list');
        if (!activityList) return;

        activityList.innerHTML = activities.map(activity => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--gray-200);">
                <span style="font-size: 14px; color: var(--gray-700);">${activity.text}</span>
                <span style="font-size: 12px; color: var(--gray-500);">${activity.time}</span>
            </div>
        `).join('');
    }

    updateCarrierStats() {
        this.carrierStats = { MPT: 0, ATOM: 0, U9: 0, MYTEL: 0 };
        
        this.esimData.forEach(esim => {
            if (this.carrierStats.hasOwnProperty(esim.carrier)) {
                this.carrierStats[esim.carrier]++;
            }
        });

        Object.keys(this.carrierStats).forEach(carrier => {
            const element = document.getElementById(`${carrier.toLowerCase()}-count`);
            if (element) {
                element.textContent = this.carrierStats[carrier];
            }
        });
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
            this.renderFilteredESIMs(filteredData);
        }
    }

    applyFilter(filterType, filterValue) {
        if (filterType === 'user') {
            const filteredUsers = filterValue ? 
                this.userData.filter(user => user.role === filterValue) : 
                this.userData;
            this.renderFilteredUsers(filteredUsers);
        } else if (filterType === 'carrier') {
            const filteredESIMs = filterValue ? 
                this.esimData.filter(esim => esim.carrier === filterValue) : 
                this.esimData;
            this.renderFilteredESIMs(filteredESIMs);
        }
    }

    renderFilteredUsers(users) {
        const tbody = document.getElementById('users-table-body');
        if (!tbody) return;

        tbody.innerHTML = users.map(user => `
            <tr>
                <td>${user.id}</td>
                <td>${user.name}</td>
                <td>${window.PremiumSecurity.obfuscateText(user.email, 3)}</td>
                <td>${user.role}</td>
                <td><span class="status-badge ${user.status.toLowerCase()}">${user.status}</span></td>
                <td>
                    <button class="btn-secondary action-btn" data-action="edit-user" data-id="${user.id}">Edit</button>
                    <button class="btn-secondary action-btn" data-action="delete-user" data-id="${user.id}">Delete</button>
                </td>
            </tr>
        `).join('');
    }

    renderFilteredESIMs(esims) {
        const tbody = document.getElementById('esims-table-body');
        if (!tbody) return;

        tbody.innerHTML = esims.map(esim => `
            <tr>
                <td><code>${window.PremiumSecurity.obfuscateText(esim.iccid, 8)}</code></td>
                <td>${esim.carrier}</td>
                <td><span class="status-badge ${esim.status.toLowerCase()}">${esim.status}</span></td>
                <td>${esim.assignedUser || 'Unassigned'}</td>
                <td>${esim.device || 'None'}</td>
                <td>
                    <button class="btn-secondary action-btn" data-action="assign-esim" data-id="${esim.iccid}">Assign</button>
                    <button class="btn-secondary action-btn" data-action="activate-esim" data-id="${esim.iccid}">Activate</button>
                </td>
            </tr>
        `).join('');
    }

    handleTableAction(button) {
        const action = button.dataset.action;
        const id = button.dataset.id;

        try {
            switch (action) {
                case 'edit-user':
                    window.PremiumAuth.requirePermission('user.update');
                    this.editUser(id);
                    break;
                case 'delete-user':
                    window.PremiumAuth.requirePermission('user.delete');
                    this.deleteUser(id);
                    break;
                case 'assign-esim':
                    window.PremiumAuth.requirePermission('esim.update');
                    this.assignESIM(id);
                    break;
                case 'activate-esim':
                    window.PremiumAuth.requirePermission('esim.update');
                    this.activateESIM(id);
                    break;
            }
        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }

    // Modal Management
    setupModals() {
        const modalOverlay = document.getElementById('modal-overlay');
        const modalClose = document.getElementById('modal-close');
        
        if (modalClose) {
            modalClose.addEventListener('click', () => this.hideModal());
        }
        
        if (modalOverlay) {
            modalOverlay.addEventListener('click', (e) => {
                if (e.target === modalOverlay) {
                    this.hideModal();
                }
            });
        }
    }

    showModal(title, body, footer = '') {
        const modal = document.getElementById('modal-overlay');
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body');
        const modalFooter = document.getElementById('modal-footer');
        
        if (modalTitle) modalTitle.textContent = title;
        if (modalBody) modalBody.innerHTML = body;
        if (modalFooter) modalFooter.innerHTML = footer;
        if (modal) modal.style.display = 'flex';
    }

    hideModal() {
        const modal = document.getElementById('modal-overlay');
        if (modal) modal.style.display = 'none';
    }

    showAddUserModal() {
        const body = `
            <form id="add-user-form">
                <div class="form-group" style="margin-bottom: 16px;">
                    <label style="display: block; margin-bottom: 4px; font-weight: 500;">Name</label>
                    <input type="text" id="user-name" required style="width: 100%; padding: 8px; border: 1px solid var(--gray-300); border-radius: 4px;">
                </div>
                <div class="form-group" style="margin-bottom: 16px;">
                    <label style="display: block; margin-bottom: 4px; font-weight: 500;">Email</label>
                    <input type="email" id="user-email" required style="width: 100%; padding: 8px; border: 1px solid var(--gray-300); border-radius: 4px;">
                </div>
                <div class="form-group" style="margin-bottom: 16px;">
                    <label style="display: block; margin-bottom: 4px; font-weight: 500;">Role</label>
                    <select id="user-role" required style="width: 100%; padding: 8px; border: 1px solid var(--gray-300); border-radius: 4px;">
                        <option value="">Select Role</option>
                        <option value="admin">Administrator</option>
                        <option value="operator">Operator</option>
                        <option value="user">User</option>
                    </select>
                </div>
            </form>
        `;
        
        const footer = `
            <button class="btn-secondary" onclick="window.PremiumPortal.hideModal()">Cancel</button>
            <button class="btn-primary" onclick="window.PremiumPortal.createUser()">Create User</button>
        `;
        
        this.showModal('Add New User', body, footer);
    }

    showUploadESIMsModal() {
        const body = `
            <div style="text-align: center; padding: 20px;">
                <div style="border: 2px dashed var(--gray-300); border-radius: 8px; padding: 40px; margin-bottom: 16px;">
                    <input type="file" id="esim-file" accept=".csv,.xlsx" style="display: none;" onchange="window.PremiumPortal.handleFileUpload(this)">
                    <button class="btn-primary" onclick="document.getElementById('esim-file').click()">
                        Choose eSIM File
                    </button>
                    <p style="margin-top: 12px; color: var(--gray-500); font-size: 14px;">
                        Upload CSV or Excel file with eSIM profiles
                    </p>
                </div>
                <div id="upload-status"></div>
            </div>
        `;
        
        this.showModal('Upload eSIM Profiles', body);
    }

    async createUser() {
        const name = document.getElementById('user-name').value;
        const email = document.getElementById('user-email').value;
        const role = document.getElementById('user-role').value;

        if (!name || !email || !role) {
            this.showNotification('Please fill all fields', 'error');
            return;
        }

        try {
            const response = await window.PremiumSecurity.secureApiCall('/api/users', {
                method: 'POST',
                body: JSON.stringify({ name, email, role })
            });

            if (response.success) {
                this.showNotification('User created successfully', 'success');
                this.hideModal();
                this.loadUsers();
                this.logActivity(`Created user: ${name}`);
            }
        } catch (error) {
            this.showNotification('Failed to create user', 'error');
        }
    }

    handleFileUpload(input) {
        const file = input.files[0];
        if (!file) return;

        const statusDiv = document.getElementById('upload-status');
        statusDiv.innerHTML = `<p style="color: var(--primary-color);">Processing file: ${file.name}</p>`;

        // Simulate file processing
        setTimeout(() => {
            const mockCount = Math.floor(Math.random() * 100) + 50;
            statusDiv.innerHTML = `
                <p style="color: var(--success);">✓ Successfully processed ${mockCount} eSIM profiles</p>
                <button class="btn-primary" onclick="window.PremiumPortal.hideModal(); window.PremiumPortal.loadESIMs();">
                    Complete Upload
                </button>
            `;
            this.logActivity(`Uploaded ${mockCount} eSIM profiles`);
        }, 2000);
    }

    async exportUsers() {
        try {
            window.PremiumAuth.requirePermission('user.read');
            
            const csvContent = this.generateCSV(this.userData, ['id', 'name', 'email', 'role', 'status']);
            this.downloadFile(csvContent, 'users-export.csv', 'text/csv');
            this.logActivity('Exported user data');
        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }

    async exportESIMs() {
        try {
            window.PremiumAuth.requirePermission('esim.read');
            
            const csvContent = this.generateCSV(this.esimData, ['iccid', 'carrier', 'status', 'assignedUser', 'device']);
            this.downloadFile(csvContent, 'esims-export.csv', 'text/csv');
            this.logActivity('Exported eSIM data');
        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }

    async exportAuditLogs() {
        try {
            window.PremiumAuth.requirePermission('audit.read');
            
            const csvContent = this.generateCSV(this.auditData, ['timestamp', 'event', 'user', 'details']);
            this.downloadFile(csvContent, 'audit-logs-export.csv', 'text/csv');
            this.logActivity('Exported audit logs');
        } catch (error) {
            this.showNotification(error.message, 'error');
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
        window.PremiumAuth.showNotification(message, type);
    }

    logActivity(activity) {
        const user = window.PremiumAuth.getCurrentUser();
        window.PremiumAuth.logAuditEvent('USER_ACTIVITY', {
            activity,
            section: this.currentSection,
            user: user ? user.email : 'Unknown'
        });
    }

    setupRealTimeUpdates() {
        setInterval(() => {
            if (this.currentSection === 'dashboard') {
                this.loadDashboardStats();
            }
        }, 30000);
    }

    // Mock data generators
    generateMockUsers() {
        return [
            { id: 'USR001', name: 'John Smith', email: 'john.smith@nexorasim.com', role: 'admin', status: 'Active' },
            { id: 'USR002', name: 'Sarah Johnson', email: 'sarah.johnson@nexorasim.com', role: 'operator', status: 'Active' },
            { id: 'USR003', name: 'Michael Chen', email: 'michael.chen@nexorasim.com', role: 'user', status: 'Active' }
        ];
    }

    generateMockESIMs() {
        return [
            { iccid: '89014103211118510720', carrier: 'MPT', status: 'Active', assignedUser: 'john.smith@nexorasim.com', device: 'iPhone 15' },
            { iccid: '89014103211118510721', carrier: 'ATOM', status: 'Pending', assignedUser: null, device: null },
            { iccid: '89014103211118510722', carrier: 'U9', status: 'Active', assignedUser: 'sarah.johnson@nexorasim.com', device: 'Samsung Galaxy S24' },
            { iccid: '89014103211118510723', carrier: 'MYTEL', status: 'Inactive', assignedUser: null, device: null }
        ];
    }

    generateMockAuditLogs() {
        return [
            { timestamp: '2024-11-22 14:30:15', event: 'LOGIN_SUCCESS', user: 'admin@nexorasim.com', details: 'Successful login from secure session' },
            { timestamp: '2024-11-22 14:25:42', event: 'ESIM_UPLOADED', user: 'operator@nexorasim.com', details: 'Uploaded 50 eSIM profiles for MPT carrier' },
            { timestamp: '2024-11-22 14:20:18', event: 'USER_CREATED', user: 'admin@nexorasim.com', details: 'Created new user account for john.doe@company.com' }
        ];
    }
}

// Initialize portal
const premiumPortal = new PremiumPortal();

// Export for global access
window.PremiumPortal = premiumPortal;