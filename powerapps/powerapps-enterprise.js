// PowerApps Enterprise Portal JavaScript
class NexoraSIMPortal {
    constructor() {
        this.currentUser = null;
        this.esimData = [];
        this.deviceData = [];
        this.init();
    }

    init() {
        this.initializeAuth();
        this.setupEventListeners();
        this.loadDashboardData();
        this.setupNavigation();
    }

    // Authentication
    initializeAuth() {
        // Microsoft Entra ID integration
        const userInfo = this.getCurrentUser();
        if (userInfo) {
            document.getElementById('userInfo').textContent = `Welcome, ${userInfo.name}`;
            this.currentUser = userInfo;
        } else {
            this.redirectToLogin();
        }
    }

    getCurrentUser() {
        // PowerApps Portal user context
        return {
            name: 'Enterprise User',
            email: 'user@nexorasim.com',
            role: 'Administrator',
            tenantId: 'd7ff8066-4e28-4170-9805-b60ec642c442'
        };
    }

    redirectToLogin() {
        window.location.href = '/signin';
    }

    signOut() {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/signout';
    }

    // Navigation
    setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-link[data-section]');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = e.target.closest('.nav-link').dataset.section;
                this.showSection(section);
                this.updateActiveNav(e.target.closest('.nav-link'));
            });
        });
    }

    showSection(sectionId) {
        // Hide all sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        
        // Show target section
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');
            targetSection.classList.add('fade-in');
        }

        // Load section-specific data
        this.loadSectionData(sectionId);
    }

    updateActiveNav(activeLink) {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        activeLink.classList.add('active');
    }

    // Dashboard Data
    loadDashboardData() {
        this.updateStats();
        this.loadRecentActivity();
    }

    updateStats() {
        // Simulate API calls
        setTimeout(() => {
            document.getElementById('totalESIMs').textContent = '1,247';
            document.getElementById('totalUsers').textContent = '89';
            document.getElementById('totalDevices').textContent = '156';
        }, 500);
    }

    loadRecentActivity() {
        // Load recent eSIM activations, device enrollments, etc.
        console.log('Loading recent activity...');
    }

    // eSIM Management
    loadSectionData(sectionId) {
        switch(sectionId) {
            case 'esim-management':
                this.loadESIMData();
                break;
            case 'device-enrollment':
                this.loadDeviceData();
                break;
            case 'carrier-config':
                this.loadCarrierStatus();
                break;
            case 'security':
                this.loadSecurityStatus();
                break;
        }
    }

    loadESIMData() {
        const tableBody = document.getElementById('esimTable');
        if (!tableBody) return;

        // Sample eSIM data
        const esimData = [
            {
                iccid: '8944501234567890123',
                user: 'john.doe@company.com',
                carrier: 'MPT Myanmar',
                status: 'Active',
                activated: '2024-01-15'
            },
            {
                iccid: '8944501234567890124',
                user: 'jane.smith@company.com',
                carrier: 'ATOM Myanmar',
                status: 'Pending',
                activated: '2024-01-16'
            }
        ];

        tableBody.innerHTML = esimData.map(esim => `
            <tr>
                <td><code>${esim.iccid}</code></td>
                <td>${esim.user}</td>
                <td>${esim.carrier}</td>
                <td><span class="badge bg-${esim.status === 'Active' ? 'success' : 'warning'}">${esim.status}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="portal.viewESIM('${esim.iccid}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="portal.suspendESIM('${esim.iccid}')">
                        <i class="fas fa-pause"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    // eSIM Operations
    provisionESIM() {
        const form = document.getElementById('esimForm');
        if (!form) return;

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const formData = {
                userEmail: document.getElementById('userEmail').value,
                carrier: document.getElementById('carrier').value,
                dataPlan: document.getElementById('dataPlan').value,
                deviceType: document.getElementById('deviceType').value
            };

            this.processESIMProvisioning(formData);
        });
    }

    processESIMProvisioning(data) {
        // Show loading state
        const submitBtn = document.querySelector('#esimForm button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Provisioning...';
        submitBtn.disabled = true;

        // Simulate API call
        setTimeout(() => {
            this.showNotification('eSIM provisioned successfully!', 'success');
            document.getElementById('esimForm').reset();
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
            this.loadESIMData();
        }, 2000);
    }

    viewESIM(iccid) {
        this.showNotification(`Viewing eSIM: ${iccid}`, 'info');
    }

    suspendESIM(iccid) {
        if (confirm('Are you sure you want to suspend this eSIM?')) {
            this.showNotification(`eSIM ${iccid} suspended`, 'warning');
            this.loadESIMData();
        }
    }

    // Device Enrollment
    loadDeviceData() {
        console.log('Loading device enrollment data...');
    }

    enrollAppleDevice() {
        const serialNumber = document.getElementById('deviceSerial').value;
        if (!serialNumber) {
            this.showNotification('Please enter device serial number', 'error');
            return;
        }

        this.showNotification('Enrolling iOS device...', 'info');
        
        // Simulate Apple Business Manager API call
        setTimeout(() => {
            this.showNotification('iOS device enrolled successfully!', 'success');
            document.getElementById('deviceSerial').value = '';
        }, 2000);
    }

    enrollAndroidDevice() {
        const imei = document.getElementById('deviceIMEI').value;
        if (!imei) {
            this.showNotification('Please enter device IMEI', 'error');
            return;
        }

        this.showNotification('Enrolling Android device...', 'info');
        
        // Simulate Android Enterprise API call
        setTimeout(() => {
            this.showNotification('Android device enrolled successfully!', 'success');
            document.getElementById('deviceIMEI').value = '';
        }, 2000);
    }

    // Carrier Management
    loadCarrierStatus() {
        // Update carrier status indicators
        const carriers = ['MPT', 'ATOM', 'U9', 'MYTEL'];
        carriers.forEach(carrier => {
            // Simulate carrier status check
            console.log(`Checking ${carrier} status...`);
        });
    }

    // Security
    loadSecurityStatus() {
        console.log('Loading security status...');
    }

    // Utilities
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show position-fixed`;
        notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        notification.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        document.body.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    generateReport() {
        this.showNotification('Generating enterprise report...', 'info');
        
        setTimeout(() => {
            this.showNotification('Report generated successfully!', 'success');
            // Simulate file download
            const link = document.createElement('a');
            link.href = 'data:text/plain;charset=utf-8,NexoraSIM Enterprise Report\nGenerated: ' + new Date().toISOString();
            link.download = 'nexorasim-report.txt';
            link.click();
        }, 2000);
    }

    // Event Listeners
    setupEventListeners() {
        // Global event listeners
        window.addEventListener('load', () => {
            document.body.classList.add('fade-in');
        });

        // Form submissions
        document.addEventListener('submit', (e) => {
            if (e.target.id === 'esimForm') {
                e.preventDefault();
                this.provisionESIM();
            }
        });

        // Search functionality
        document.addEventListener('input', (e) => {
            if (e.target.classList.contains('search-input')) {
                this.handleSearch(e.target.value);
            }
        });
    }

    handleSearch(query) {
        // Implement search functionality
        console.log('Searching for:', query);
    }
}

// Global functions for onclick handlers
function showSection(sectionId) {
    portal.showSection(sectionId);
}

function signOut() {
    portal.signOut();
}

function provisionESIM() {
    portal.provisionESIM();
}

function enrollDevice() {
    portal.showSection('device-enrollment');
}

function enrollAppleDevice() {
    portal.enrollAppleDevice();
}

function enrollAndroidDevice() {
    portal.enrollAndroidDevice();
}

function generateReport() {
    portal.generateReport();
}

// Initialize portal when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.portal = new NexoraSIMPortal();
});

// PowerApps Portal Integration
if (typeof window.PowerApps !== 'undefined') {
    // PowerApps specific initialization
    window.PowerApps.onReady(() => {
        console.log('PowerApps Portal ready');
        // Additional PowerApps integration code
    });
}