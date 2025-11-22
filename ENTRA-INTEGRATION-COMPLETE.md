# NexoraSIM eSIM Enterprise Management - Entra ID Integration Complete

## Integration Summary

The NexoraSIM eSIM Enterprise Management system has been successfully integrated with Microsoft Entra ID using the specific organizational tenant configuration.

## Tenant Configuration

### Organizational Directory
- **Tenant ID**: d7ff8066-4e28-4170-9805-b60ec642c442
- **Application ID**: 56b29d70-add0-4e62-a33c-fd1fb44da71a
- **Object ID**: 81ec3d01-bc0f-428f-9527-1c65d204ed6d
- **Authority URL**: https://login.microsoftonline.com/d7ff8066-4e28-4170-9805-b60ec642c442

### OAuth 2.0 Endpoints
- **Authorization Endpoint (v2)**: https://login.microsoftonline.com/d7ff8066-4e28-4170-9805-b60ec642c442/oauth2/v2.0/authorize
- **Token Endpoint (v2)**: https://login.microsoftonline.com/d7ff8066-4e28-4170-9805-b60ec642c442/oauth2/v2.0/token
- **Logout Endpoint**: https://login.microsoftonline.com/d7ff8066-4e28-4170-9805-b60ec642c442/oauth2/v2.0/logout

### SAML Endpoints
- **SAML-P Sign-on**: https://login.microsoftonline.com/d7ff8066-4e28-4170-9805-b60ec642c442/saml2
- **SAML-P Sign-out**: https://login.microsoftonline.com/d7ff8066-4e28-4170-9805-b60ec642c442/saml2

### Federation Endpoints
- **WS-Federation**: https://login.microsoftonline.com/d7ff8066-4e28-4170-9805-b60ec642c442/wsfed
- **Federation Metadata**: https://login.microsoftonline.com/d7ff8066-4e28-4170-9805-b60ec642c442/federationmetadata/2007-06/federationmetadata.xml
- **OpenID Connect Metadata**: https://login.microsoftonline.com/d7ff8066-4e28-4170-9805-b60ec642c442/v2.0/.well-known/openid-configuration

## Application Configuration

### Redirect URIs
- **Primary**: https://nexorasim.powerappsportals.com
- **Callback**: https://nexorasim.powerappsportals.com/auth/callback

### Required Permissions
- **User.Read**: Read user profile information
- **DeviceManagementConfiguration.ReadWrite.All**: Manage device configurations
- **Directory.ReadWrite.All**: Read and write directory data

### Sign-in Audience
- **AzureADMyOrg**: Accounts in this organizational directory only

## Security Groups

### NexoraSIM Enterprise Users
- **Purpose**: All enterprise users with basic access
- **Mail Nickname**: nexorasim-enterprise-users

### NexoraSIM eSIM Operators
- **Purpose**: eSIM lifecycle operators with operational access
- **Mail Nickname**: nexorasim-esim-operators

### NexoraSIM eSIM Administrators
- **Purpose**: Full system administrators with complete access
- **Mail Nickname**: nexorasim-esim-admins

## Conditional Access Policies

### MFA Enforcement
- **Policy**: Require MFA for All Users
- **Target**: NexoraSIM Enterprise Users
- **Application**: 56b29d70-add0-4e62-a33c-fd1fb44da71a
- **Control**: Multi-factor Authentication

### Legacy Authentication Block
- **Policy**: Block Legacy Authentication
- **Target**: All enterprise users
- **Control**: Block access for legacy protocols

### Device Compliance
- **Policy**: Require Compliant Device for eSIM Operations
- **Target**: eSIM Operators
- **Control**: MFA + Compliant Device

## Custom RBAC Roles

### NexoraSIM eSIM Administrator
- **Permissions**: Full eSIM lifecycle management
- **Actions**: Create applications, manage devices, write configurations

### NexoraSIM eSIM Operator
- **Permissions**: Limited operational access
- **Actions**: Read device management, read audit logs

### NexoraSIM Customer
- **Permissions**: Self-service access
- **Actions**: Read owned devices, manage personal profiles

## Authentication Flow

### Login Process
1. User accesses https://nexorasim.powerappsportals.com
2. Redirect to Entra ID authorization endpoint
3. User authenticates with organizational credentials
4. MFA challenge if required by policy
5. Authorization code returned to application
6. Application exchanges code for access token
7. User profile loaded from Microsoft Graph

### Logout Process
1. Clear local session storage
2. Redirect to Entra ID logout endpoint
3. Return to portal home page

## Integration Components

### Backend Services
- **EntraAuthService.cs**: Authentication and authorization service
- **EntraIDIntegration.cs**: Device management and compliance
- **AppleBusinessManager.cs**: iOS device enrollment integration

### Frontend Components
- **auth-config.js**: Centralized authentication configuration
- **nexorasim-portal.js**: Main portal authentication logic
- **esim-management.js**: Enterprise management authentication

### Configuration Files
- **entra-authority-config.json**: Complete endpoint configuration
- **entra-id-config.json**: Application and policy configuration

## Apple Business Manager Integration

### Device Enrollment
- **UDID Management**: Apple device identification
- **MDM Profile Assignment**: Automated profile deployment
- **Enterprise Integration**: Seamless iOS device management

### Authentication Flow
- Entra ID authentication for Apple device operations
- Role-based access for device enrollment
- Audit logging for all Apple operations

## Microsoft Graph Integration

### User Management
- Profile information retrieval
- Group membership validation
- Role assignment verification

### Device Management
- Intune device configuration
- Compliance policy enforcement
- Conditional access evaluation

## Production Deployment

### Portal URLs
- **Main Portal**: https://nexorasim.powerappsportals.com
- **Enterprise Management**: https://nexorasim.powerappsportals.com/esim-management.html

### API Endpoints
- **Authentication**: /api/auth/validate
- **User Profile**: /api/user/profile
- **Device Management**: /api/device/configure

## Security Compliance

### Authentication Security
- OAuth 2.0 with PKCE
- JWT token validation
- Secure token storage
- Automatic token refresh

### Authorization Security
- Role-based access control
- Conditional access enforcement
- Device compliance validation
- Audit trail logging

### Data Protection
- Encrypted communication (TLS 1.3)
- Secure credential storage
- GDPR compliance
- SOC 2 alignment

## Validation Checklist

### Authentication
- Entra ID SSO functional
- MFA enforcement active
- Role-based access working
- Conditional access policies applied

### Integration
- Microsoft Graph API connected
- Apple Business Manager integrated
- Device management operational
- Audit logging functional

### Security
- Token validation working
- Secure logout implemented
- Session management active
- Compliance policies enforced

The NexoraSIM eSIM Enterprise Management system is now fully integrated with Microsoft Entra ID, providing enterprise-grade authentication, authorization, and device management capabilities.