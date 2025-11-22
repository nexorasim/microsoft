// NexoraSIM eSIM Enterprise Management - Authentication Configuration

const NEXORA_AUTH_CONFIG = {
    tenantId: 'd7ff8066-4e28-4170-9805-b60ec642c442',
    clientId: '56b29d70-add0-4e62-a33c-fd1fb44da71a',
    authority: 'https://login.microsoftonline.com/d7ff8066-4e28-4170-9805-b60ec642c442',
    redirectUri: 'https://nexorasim.powerappsportals.com',
    scopes: [
        'https://graph.microsoft.com/User.Read',
        'https://graph.microsoft.com/DeviceManagementConfiguration.ReadWrite.All',
        'https://graph.microsoft.com/Directory.ReadWrite.All'
    ],
    endpoints: {
        authorize: 'https://login.microsoftonline.com/d7ff8066-4e28-4170-9805-b60ec642c442/oauth2/v2.0/authorize',
        token: 'https://login.microsoftonline.com/d7ff8066-4e28-4170-9805-b60ec642c442/oauth2/v2.0/token',
        logout: 'https://login.microsoftonline.com/d7ff8066-4e28-4170-9805-b60ec642c442/oauth2/v2.0/logout',
        graph: 'https://graph.microsoft.com/v1.0'
    }
};

class NexoraAuth {
    constructor() {
        this.accessToken = null;
        this.user = null;
    }

    getAuthUrl(state = null) {
        const params = new URLSearchParams({
            client_id: NEXORA_AUTH_CONFIG.clientId,
            response_type: 'code',
            redirect_uri: NEXORA_AUTH_CONFIG.redirectUri,
            scope: NEXORA_AUTH_CONFIG.scopes.join(' '),
            response_mode: 'query'
        });

        if (state) params.append('state', state);

        return `${NEXORA_AUTH_CONFIG.endpoints.authorize}?${params.toString()}`;
    }

    getLogoutUrl() {
        const params = new URLSearchParams({
            post_logout_redirect_uri: NEXORA_AUTH_CONFIG.redirectUri
        });

        return `${NEXORA_AUTH_CONFIG.endpoints.logout}?${params.toString()}`;
    }

    async validateToken(token) {
        try {
            const response = await fetch(`${NEXORA_AUTH_CONFIG.endpoints.graph}/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                this.user = await response.json();
                this.accessToken = token;
                return true;
            }
            return false;
        } catch (error) {
            console.error('Token validation failed:', error);
            return false;
        }
    }

    async getUserRoles() {
        if (!this.accessToken) return [];

        try {
            const response = await fetch(`${NEXORA_AUTH_CONFIG.endpoints.graph}/me/memberOf`, {
                headers: { 'Authorization': `Bearer ${this.accessToken}` }
            });

            if (response.ok) {
                const data = await response.json();
                return data.value.map(group => group.displayName);
            }
            return [];
        } catch (error) {
            console.error('Failed to get user roles:', error);
            return [];
        }
    }

    isAuthenticated() {
        return this.accessToken !== null && this.user !== null;
    }

    logout() {
        this.accessToken = null;
        this.user = null;
        sessionStorage.clear();
        window.location.href = this.getLogoutUrl();
    }
}

window.NexoraAuth = NexoraAuth;
window.NEXORA_AUTH_CONFIG = NEXORA_AUTH_CONFIG;