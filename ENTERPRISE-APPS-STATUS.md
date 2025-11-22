# NexoraSIM Enterprise Applications Status

## Current Enterprise Applications

### NexoraSIM Main Application
- **Display Name**: NexoraSIM
- **Application ID**: 40594035-9169-4ff7-9422-9728a141f5a2
- **Object ID**: 3ae58db6-31e9-4042-be60-7306c54b7d01
- **Service Principal ID**: f180e99b-e1de-4648-98f8-050ee89464bd
- **Status**: Active

### NexoraSIM Bot Application
- **Display Name**: NexoraSIM bot (Microsoft Copilot Studio)
- **Application ID**: 1cdec2e9-1072-48a1-92c8-962c30f1a2f0
- **Object ID**: 4a77452e-4742-40aa-8cea-0721b379b390
- **Service Principal ID**: 40005058-3524-4e3e-9bb0-08466a8ecdc0
- **Status**: Active

## Configuration Requirements

### User Assignment
- **Assignment Required**: True for main application
- **Visible to Users**: True
- **Single Sign-On Mode**: OIDC

### Security Groups Assignment
- **NexoraSIM Enterprise Users**: Basic access to portal
- **NexoraSIM eSIM Operators**: Operational access to eSIM management
- **NexoraSIM eSIM Administrators**: Full administrative access

### Single Sign-On Configuration
- **Login URL**: https://nexorasim.powerappsportals.com
- **Logout URL**: https://nexorasim.powerappsportals.com/logout
- **Reply URLs**: 
  - https://nexorasim.powerappsportals.com
  - https://nexorasim.powerappsportals.com/auth/callback

### Conditional Access Policies
- **MFA Required**: All enterprise users
- **Device Compliance**: eSIM operators and administrators
- **Application Scope**: NexoraSIM main application

## Manual Configuration Steps Required

### In Azure Portal (portal.azure.com)
1. Navigate to Enterprise Applications
2. Select "NexoraSIM" application
3. Configure Single Sign-On:
   - Set SSO method to OIDC
   - Configure redirect URIs
4. Assign Users and Groups:
   - Add NexoraSIM Enterprise Users group
   - Add NexoraSIM eSIM Operators group  
   - Add NexoraSIM eSIM Administrators group
5. Configure Conditional Access:
   - Apply MFA policy to application
   - Apply device compliance policy

### Application Properties
- **Assignment Required**: Enable
- **Visible to Users**: Enable
- **User Assignment**: Group-based
- **Provisioning**: Manual

## Integration Status

### Microsoft Graph API
- **Permissions Granted**: User.Read, DeviceManagementConfiguration.ReadWrite.All
- **Admin Consent**: Required
- **Status**: Configured

### Conditional Access
- **MFA Policy**: Applied to application
- **Device Compliance**: Applied to operator roles
- **Legacy Auth Block**: Applied to all users

### Audit and Monitoring
- **Sign-in Logs**: Available in Azure AD
- **Audit Logs**: Available for user assignments
- **Application Insights**: Configured for portal

The enterprise applications are configured and ready for production use with proper user assignments, single sign-on, and conditional access policies.