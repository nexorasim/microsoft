// NexoraSIM eSIM Enterprise Management JavaScript

let currentUser = null;
let accessToken = null;
let profileStats = { downloaded: 0, active: 0, suspended: 0, revoked: 0 };

document.addEventListener('DOMContentLoaded', function() {
    initializeAuth();
    loadUserProfile();
    loadProfileStats();
    loadAuditTrail();
});

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
        const response = await fetch('https://graph.microsoft.com/v1.0/me', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        
        if (response.ok) {
            currentUser = await response.json();
            if (document.getElementById('userDisplayName')) {
                document.getElementById('userDisplayName').textContent = currentUser.displayName || currentUser.userPrincipalName;
            }
        }
    } catch (error) {
        console.error('Failed to load user profile:', error);
        if (document.getElementById('userDisplayName')) {
            document.getElementById('userDisplayName').textContent = 'Enterprise User';
        }
    }
}

async function downloadProfile() {
    const operator = document.getElementById('operatorSelect').value;
    const userId = document.getElementById('enterpriseUserId').value;
    const platform = document.getElementById('devicePlatform').value;
    
    if (!userId) {
        showAlert('warning', 'Please enter Enterprise User ID');
        return;
    }
    
    try {
        const response = await fetch('/api/esim/download', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                operator: operator,
                userId: userId,
                platform: platform,
                requestedBy: currentUser.userPrincipalName
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showAlert('success', `eSIM profile downloaded successfully. ICCID: ${result.iccid}`);
            updateProfileStats();
            logAuditEvent('PROFILE_DOWNLOAD', userId, result.iccid, operator, 'SUCCESS');
        } else {
            showAlert('danger', `Profile download failed: ${result.error}`);
            logAuditEvent('PROFILE_DOWNLOAD', userId, '', operator, 'FAILED');
        }
    } catch (error) {
        console.error('Profile download failed:', error);
        showAlert('danger', 'Profile download failed. Please try again.');
    }
}

async function activateProfile() {
    const operator = document.getElementById('operatorSelect').value;
    const userId = document.getElementById('enterpriseUserId').value;
    
    if (!userId) {
        showAlert('warning', 'Please enter Enterprise User ID');
        return;
    }
    
    try {
        const response = await fetch('/api/esim/activate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                operator: operator,
                userId: userId,
                activatedBy: currentUser.userPrincipalName
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showAlert('success', 'eSIM profile activated successfully');
            updateProfileStats();
            logAuditEvent('PROFILE_ACTIVATE', userId, result.iccid, operator, 'SUCCESS');
        } else {
            showAlert('danger', `Profile activation failed: ${result.error}`);
        }
    } catch (error) {
        console.error('Profile activation failed:', error);
        showAlert('danger', 'Profile activation failed. Please try again.');
    }
}

async function suspendProfile() {
    const operator = document.getElementById('operatorSelect').value;
    const userId = document.getElementById('enterpriseUserId').value;
    
    if (!userId) {
        showAlert('warning', 'Please enter Enterprise User ID');
        return;
    }
    
    if (!confirm('Are you sure you want to suspend this eSIM profile?')) {
        return;
    }
    
    try {
        const response = await fetch('/api/esim/suspend', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                operator: operator,
                userId: userId,
                suspendedBy: currentUser.userPrincipalName,
                reason: 'Administrative suspension'
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showAlert('success', 'eSIM profile suspended successfully');
            updateProfileStats();
            logAuditEvent('PROFILE_SUSPEND', userId, result.iccid, operator, 'SUCCESS');
        } else {
            showAlert('danger', `Profile suspension failed: ${result.error}`);
        }
    } catch (error) {
        console.error('Profile suspension failed:', error);
        showAlert('danger', 'Profile suspension failed. Please try again.');
    }
}

async function revokeProfile() {
    const operator = document.getElementById('operatorSelect').value;
    const userId = document.getElementById('enterpriseUserId').value;
    
    if (!userId) {
        showAlert('warning', 'Please enter Enterprise User ID');
        return;
    }
    
    if (!confirm('Are you sure you want to permanently revoke this eSIM profile? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch('/api/esim/revoke', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                operator: operator,
                userId: userId,
                revokedBy: currentUser.userPrincipalName,
                reason: 'Administrative revocation'
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showAlert('success', 'eSIM profile revoked successfully');
            updateProfileStats();
            logAuditEvent('PROFILE_REVOKE', userId, result.iccid, operator, 'SUCCESS');
        } else {
            showAlert('danger', `Profile revocation failed: ${result.error}`);
        }
    } catch (error) {
        console.error('Profile revocation failed:', error);
        showAlert('danger', 'Profile revocation failed. Please try again.');
    }
}

async function enrollAppleDevice() {
    const udid = document.getElementById('appleUDID').value;
    const mdmProfile = document.getElementById('mdmProfile').value;
    
    if (!udid) {
        showAlert('warning', 'Please enter Apple Device UDID');
        return;
    }
    
    try {
        const response = await fetch('/api/apple/enroll', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                udid: udid,
                mdmProfile: mdmProfile,
                enrolledBy: currentUser.userPrincipalName,
                businessManagerId: 'nexorasim-abm-id'
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showAlert('success', 'iOS device enrolled successfully via Apple Business Manager');
            logAuditEvent('APPLE_ENROLL', currentUser.userPrincipalName, udid, 'Apple', 'SUCCESS');
        } else {
            showAlert('danger', `Apple device enrollment failed: ${result.error}`);
        }
    } catch (error) {
        console.error('Apple device enrollment failed:', error);
        showAlert('danger', 'Apple device enrollment failed. Please try again.');
    }
}

async function configureEntraDevice() {
    const deviceId = document.getElementById('entraDeviceId').value;
    const compliancePolicy = document.getElementById('compliancePolicy').value;
    const conditionalAccess = document.getElementById('conditionalAccess').value;
    
    if (!deviceId) {
        showAlert('warning', 'Please enter Entra Device ID');
        return;
    }
    
    try {
        const response = await fetch('/api/entra/configure', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                deviceId: deviceId,
                compliancePolicy: compliancePolicy,
                conditionalAccess: conditionalAccess,
                configuredBy: currentUser.userPrincipalName
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showAlert('success', 'Entra ID device policies configured successfully');
            logAuditEvent('ENTRA_CONFIGURE', currentUser.userPrincipalName, deviceId, 'Microsoft', 'SUCCESS');
        } else {
            showAlert('danger', `Entra ID configuration failed: ${result.error}`);
        }
    } catch (error) {
        console.error('Entra ID configuration failed:', error);
        showAlert('danger', 'Entra ID configuration failed. Please try again.');
    }
}

async function loadProfileStats() {
    try {
        const response = await fetch('/api/esim/stats', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        
        if (response.ok) {
            const stats = await response.json();
            document.getElementById('downloadedCount').textContent = stats.downloaded || 0;
            document.getElementById('activeCount').textContent = stats.active || 0;
            document.getElementById('suspendedCount').textContent = stats.suspended || 0;
            document.getElementById('revokedCount').textContent = stats.revoked || 0;
        }
    } catch (error) {
        console.error('Failed to load profile stats:', error);
    }
}

async function loadAuditTrail() {
    try {
        const response = await fetch('/api/audit/trail?limit=50', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        
        if (response.ok) {
            const auditData = await response.json();
            const tbody = document.getElementById('auditTableBody');
            
            if (auditData.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center">No audit data available</td></tr>';
                return;
            }
            
            tbody.innerHTML = auditData.map(entry => `
                <tr>
                    <td>${new Date(entry.timestamp).toLocaleString()}</td>
                    <td>${entry.action}</td>
                    <td>${entry.userId}</td>
                    <td>${entry.iccid || 'N/A'}</td>
                    <td>${entry.operator}</td>
                    <td><span class="nexora-status-badge ${entry.status.toLowerCase()}">${entry.status}</span></td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error('Failed to load audit trail:', error);
        document.getElementById('auditTableBody').innerHTML = 
            '<tr><td colspan="6" class="text-center">Failed to load audit data</td></tr>';
    }
}

function updateProfileStats() {
    loadProfileStats();
}

function logAuditEvent(action, userId, iccid, operator, status) {
    const auditEntry = {
        timestamp: new Date().toISOString(),
        action: action,
        userId: userId,
        iccid: iccid,
        operator: operator,
        status: status,
        performedBy: currentUser.userPrincipalName
    };
    
    fetch('/api/audit/log', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(auditEntry)
    }).catch(error => console.error('Failed to log audit event:', error));
    
    loadAuditTrail();
}

function showAlert(type, message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `nexora-alert nexora-alert-${type}`;
    alertDiv.innerHTML = `<i class="fas fa-info-circle me-2"></i>${message}`;
    
    const container = document.querySelector('.container');
    container.insertBefore(alertDiv, container.firstChild);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

function logout() {
    sessionStorage.clear();
    window.location.href = 'https://login.microsoftonline.com/d7ff8066-4e28-4170-9805-b60ec642c442/oauth2/v2.0/logout?post_logout_redirect_uri=' + encodeURIComponent('https://nexorasim.powerappsportals.com');
}