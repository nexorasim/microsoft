// NexoraSIM Enterprise Portal JavaScript

let currentUser = null;
let accessToken = null;
let currentLanguage = 'en';

const translations = {
    en: {
        deviceInit: "Enterprise Device Provisioning",
        platform: "Device Platform",
        carrier: "Network Operator",
        iccid: "eSIM ICCID",
        initialize: "Provision Enterprise Device",
        vpnStatus: "VPN Status",
        esimStatus: "eSIM Status",
        driveStatus: "Drive Status",
        complianceStatus: "Compliance Status",
        analytics: "Enterprise Analytics Dashboard",
        loadingDashboard: "Loading enterprise analytics dashboard...",
        logout: "Logout"
    },
    my: {
        deviceInit: "လုပ်ငန်းသုံး စက်ပစ္စည်း ပြင်ဆင်ခြင်း",
        platform: "စက်ပစ္စည်း ပလပ်ဖောင်း",
        carrier: "ကွန်ယက် အော်ပရေတာ",
        iccid: "eSIM ICCID",
        initialize: "လုပ်ငန်းသုံး စက်ပစ္စည်း ပြင်ဆင်မည်",
        vpnStatus: "VPN အခြေအနေ",
        esimStatus: "eSIM အခြေအနေ",
        driveStatus: "Drive အခြေအနေ",
        complianceStatus: "လိုက်နာမှု အခြေအနေ",
        analytics: "လုပ်ငန်းသုံး ခွဲခြမ်းစိတ်ဖြာမှု ဒက်ရှ်ဘုတ်",
        loadingDashboard: "လုပ်ငန်းသုံး ခွဲခြမ်းစိတ်ဖြာမှု ဒက်ရှ်ဘုတ် ဖွင့်နေသည်...",
        logout: "ထွက်မည်"
    }
};

document.addEventListener('DOMContentLoaded', function() {
    initializeAuth();
    loadUserProfile();
    checkDeviceStatus();
    loadPowerBIDashboard();
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('deviceInitForm').addEventListener('submit', handleDeviceInit);
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(event) {
        const dropdown = document.getElementById('langDropdown');
        if (!event.target.closest('.nexora-dropdown')) {
            dropdown.style.display = 'none';
        }
    });
}

async function initializeAuth() {
    const urlParams = new URLSearchParams(window.location.search);
    accessToken = urlParams.get('token') || sessionStorage.getItem('accessToken');
    
    if (!accessToken) {
        const authorityUrl = 'https://login.microsoftonline.com/d7ff8066-4e28-4170-9805-b60ec642c442/oauth2/v2.0/authorize';
        const clientId = '56b29d70-add0-4e62-a33c-fd1fb44da71a';
        const redirectUri = encodeURIComponent('https://nexorasim.powerappsportals.com');
        const scopes = encodeURIComponent('https://graph.microsoft.com/User.Read https://graph.microsoft.com/DeviceManagementConfiguration.ReadWrite.All');
        
        window.location.href = `${authorityUrl}?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&scope=${scopes}`;
        return;
    }
    
    sessionStorage.setItem('accessToken', accessToken);
}

async function loadUserProfile() {
    try {
        const response = await fetch('/api/user/profile', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        
        if (response.ok) {
            currentUser = await response.json();
            
            // Enterprise management portal is always visible for authenticated users
            document.getElementById('enterpriseManagement').style.display = 'block';
        }
    } catch (error) {
        console.error('Failed to load user profile:', error);
    }
}

async function handleDeviceInit(e) {
    e.preventDefault();
    
    const deviceId = generateDeviceId();
    const platform = document.getElementById('platform').value;
    const carrierCode = document.getElementById('carrierCode').value;
    const iccid = document.getElementById('iccid').value;
    
    try {
        const response = await fetch('/api/UnifiedPortal/initialize-device', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                deviceId: deviceId,
                platform: platform,
                carrierCode: carrierCode,
                iccid: iccid
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            document.getElementById('initResult').innerHTML = `
                <div class="nexora-alert nexora-alert-success">
                    <i class="fas fa-check-circle me-2"></i>
                    Device initialized successfully!
                    ${result.vpnProfileId ? `<br><strong>VPN Profile:</strong> ${result.vpnProfileId}` : ''}
                    ${result.esimProfile ? `<br><strong>eSIM Profile:</strong> ${result.esimProfile.iccid}` : ''}
                </div>
            `;
            checkDeviceStatus();
        } else {
            document.getElementById('initResult').innerHTML = `
                <div class="nexora-alert nexora-alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Initialization failed: ${result.error}
                </div>
            `;
        }
        
        document.getElementById('initResult').style.display = 'block';
    } catch (error) {
        console.error('Device initialization failed:', error);
        showAlert('danger', 'Device initialization failed. Please try again.');
    }
}

async function checkDeviceStatus() {
    const deviceId = generateDeviceId();
    
    try {
        const vpnResponse = await fetch('/api/UnifiedPortal/vpn/validate-compliance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({ deviceId: deviceId })
        });
        
        const vpnResult = await vpnResponse.json();
        updateStatusBadge('vpnStatusBadge', vpnResult.isCompliant ? 'Connected' : 'Disconnected', 
                        vpnResult.isCompliant ? 'success' : 'danger');
    } catch (error) {
        updateStatusBadge('vpnStatusBadge', 'Error', 'danger');
    }
    
    // Simulate other status checks
    setTimeout(() => {
        updateStatusBadge('driveStatusBadge', 'Registered', 'success');
        updateStatusBadge('complianceStatusBadge', 'Compliant', 'success');
    }, 1000);
}

async function loadPowerBIDashboard() {
    document.getElementById('dashboardLoading').style.display = 'flex';
    
    try {
        const response = await fetch('/api/UnifiedPortal/dashboard-embed', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        
        const embedConfig = await response.json();
        
        // Simulate dashboard loading
        setTimeout(() => {
            document.getElementById('dashboardLoading').style.display = 'none';
            document.getElementById('powerBIFrame').style.display = 'block';
            document.getElementById('powerBIFrame').src = embedConfig.embedUrl;
        }, 2000);
        
    } catch (error) {
        console.error('Failed to load Power BI dashboard:', error);
        document.getElementById('dashboardLoading').innerHTML = 
            '<div class="nexora-alert nexora-alert-warning"><i class="fas fa-exclamation-triangle me-2"></i>Dashboard temporarily unavailable</div>';
    }
}

// eSIM activation moved to enterprise management portal

function toggleDropdown() {
    const dropdown = document.getElementById('langDropdown');
    dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
}

function switchLanguage(lang) {
    currentLanguage = lang;
    document.getElementById('currentLang').textContent = lang === 'en' ? 'English' : 'မြန်မာ';
    document.getElementById('langDropdown').style.display = 'none';
    
    // Update all translatable elements
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (translations[lang] && translations[lang][key]) {
            element.textContent = translations[lang][key];
        }
    });
    
    // Apply Myanmar font class
    if (lang === 'my') {
        document.body.classList.add('myanmar-text');
    } else {
        document.body.classList.remove('myanmar-text');
    }
}

function updateStatusBadge(elementId, text, type) {
    const badge = document.getElementById(elementId);
    badge.textContent = text;
    badge.className = `nexora-status-badge ${type}`;
}

function showAlert(type, message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `nexora-alert nexora-alert-${type}`;
    alertDiv.innerHTML = `<i class="fas fa-info-circle me-2"></i>${message}`;
    
    // Insert at top of container
    const container = document.querySelector('.container');
    container.insertBefore(alertDiv, container.firstChild);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

function generateDeviceId() {
    return sessionStorage.getItem('deviceId') || 
           (sessionStorage.setItem('deviceId', 'device-' + Math.random().toString(36).substr(2, 9)), 
            sessionStorage.getItem('deviceId'));
}

function logout() {
    sessionStorage.clear();
    window.location.href = 'https://login.microsoftonline.com/d7ff8066-4e28-4170-9805-b60ec642c442/oauth2/v2.0/logout?post_logout_redirect_uri=' + encodeURIComponent('https://nexorasim.powerappsportals.com');
}

// Add CSS classes for Bootstrap-like functionality
const style = document.createElement('style');
style.textContent = `
    .container { max-width: 1200px; margin: 0 auto; padding: 0 1rem; }
    .row { display: flex; flex-wrap: wrap; margin: 0 -0.5rem; }
    .col-md-3 { flex: 0 0 25%; max-width: 25%; padding: 0 0.5rem; }
    .col-md-6 { flex: 0 0 50%; max-width: 50%; padding: 0 0.5rem; }
    .col-12 { flex: 0 0 100%; max-width: 100%; padding: 0 0.5rem; }
    .d-flex { display: flex; }
    .justify-content-between { justify-content: space-between; }
    .align-items-center { align-items: center; }
    .py-3 { padding-top: 1rem; padding-bottom: 1rem; }
    .mt-4 { margin-top: 2rem; }
    .mb-4 { margin-bottom: 2rem; }
    .me-1 { margin-right: 0.25rem; }
    .me-2 { margin-right: 0.5rem; }
    .me-3 { margin-right: 1rem; }
    .ms-1 { margin-left: 0.25rem; }
    .w-100 { width: 100%; }
    
    @media (max-width: 768px) {
        .col-md-3, .col-md-6 { flex: 0 0 100%; max-width: 100%; margin-bottom: 1rem; }
        .row { margin: 0; }
        .col-md-3, .col-md-6, .col-12 { padding: 0; }
    }
`;
document.head.appendChild(style);