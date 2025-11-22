# NexoraSIM Enterprise Deployment Script
param(
    [Parameter(Mandatory=$true)]
    [string]$TenantId,
    
    [Parameter(Mandatory=$true)]
    [string]$SubscriptionId,
    
    [Parameter(Mandatory=$false)]
    [string]$Environment = "Production",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipInfrastructure,
    
    [Parameter(Mandatory=$false)]
    [switch]$ValidateOnly
)

# Import required modules
Import-Module Microsoft.Graph.Authentication
Import-Module Microsoft.Graph.Applications
Import-Module Microsoft.Graph.DeviceManagement
Import-Module Az.Accounts
Import-Module Az.Resources

Write-Host "Starting NexoraSIM Enterprise Deployment" -ForegroundColor Green

# Connect to Microsoft Graph and Azure
Connect-MgGraph -TenantId $TenantId -Scopes "Application.ReadWrite.All", "DeviceManagementConfiguration.ReadWrite.All", "Directory.ReadWrite.All"
Connect-AzAccount -TenantId $TenantId -SubscriptionId $SubscriptionId

# Step 1: Deploy Azure Infrastructure
if (-not $SkipInfrastructure) {
    Write-Host "Deploying Azure Infrastructure..." -ForegroundColor Yellow
    
    $resourceGroupName = "rg-nexorasim-$Environment"
    $location = "Southeast Asia"
    
    # Create Resource Group
    New-AzResourceGroup -Name $resourceGroupName -Location $location -Force
    
    # Deploy Bicep template
    $deploymentResult = New-AzResourceGroupDeployment `
        -ResourceGroupName $resourceGroupName `
        -TemplateFile ".\infra\main.bicep" `
        -environment $Environment `
        -tenantId $TenantId
    
    if ($deploymentResult.ProvisioningState -eq "Succeeded") {
        Write-Host "Infrastructure deployed successfully" -ForegroundColor Green
    } else {
        Write-Error "Infrastructure deployment failed"
        exit 1
    }
}

# Step 2: Configure Entra ID
Write-Host "Configuring Entra ID..." -ForegroundColor Yellow

$entraConfig = Get-Content ".\config\entra-id-config.json" | ConvertFrom-Json

# Create App Registration
$appRegistration = New-MgApplication `
    -DisplayName $entraConfig.appRegistrations.nexorasimPortal.displayName `
    -SignInAudience $entraConfig.appRegistrations.nexorasimPortal.signInAudience `
    -RequiredResourceAccess $entraConfig.appRegistrations.nexorasimPortal.requiredResourceAccess `
    -Web $entraConfig.appRegistrations.nexorasimPortal.web

Write-Host "App Registration created: $($appRegistration.AppId)" -ForegroundColor Green

# Create Security Groups
foreach ($group in $entraConfig.groups.securityGroups) {
    try {
        $newGroup = New-MgGroup `
            -DisplayName $group.displayName `
            -MailNickname $group.mailNickname `
            -Description $group.description `
            -SecurityEnabled:$group.securityEnabled
        
        Write-Host "Security Group created: $($group.displayName)" -ForegroundColor Green
    }
    catch {
        Write-Warning "Group may already exist: $($group.displayName)"
    }
}

# Step 3: Deploy Intune Profiles
Write-Host "Deploying Intune Profiles..." -ForegroundColor Yellow

$intuneConfig = Get-Content ".\config\intune-profiles.json" | ConvertFrom-Json

# Create VPN Profile
$vpnProfile = @{
    '@odata.type' = '#microsoft.graph.windows10VpnConfiguration'
    displayName = $intuneConfig.vpnProfiles.alwaysOnVPN.displayName
    description = $intuneConfig.vpnProfiles.alwaysOnVPN.description
    connectionName = 'NexoraSIM Enterprise VPN'
    servers = @(
        @{
            description = $intuneConfig.vpnProfiles.alwaysOnVPN.servers[0].description
            address = $intuneConfig.vpnProfiles.alwaysOnVPN.servers[0].address
            isDefaultServer = $true
        }
    )
    connectionType = 'ikEv2'
    authenticationMethod = 'certificate'
    alwaysOn = $true
    enableConditionalAccess = $true
}

$vpnProfileResult = Invoke-MgGraphRequest -Method POST -Uri "https://graph.microsoft.com/v1.0/deviceManagement/deviceConfigurations" -Body ($vpnProfile | ConvertTo-Json -Depth 10)
Write-Host "VPN Profile created: $($vpnProfileResult.id)" -ForegroundColor Green

# Create Compliance Policy
$compliancePolicy = @{
    '@odata.type' = '#microsoft.graph.windows10CompliancePolicy'
    displayName = $intuneConfig.compliancePolicies.vpnCompliance.displayName
    description = $intuneConfig.compliancePolicies.vpnCompliance.description
    deviceThreatProtectionEnabled = $true
    deviceThreatProtectionRequiredSecurityLevel = 'medium'
    passwordRequired = $true
    passwordMinimumLength = 8
    passwordRequiredType = 'alphanumeric'
}

$compliancePolicyResult = Invoke-MgGraphRequest -Method POST -Uri "https://graph.microsoft.com/v1.0/deviceManagement/deviceCompliancePolicies" -Body ($compliancePolicy | ConvertTo-Json -Depth 10)
Write-Host "Compliance Policy created: $($compliancePolicyResult.id)" -ForegroundColor Green

# Step 4: Deploy Power Platform Components
Write-Host "Deploying Power Platform Components..." -ForegroundColor Yellow

# Create Dataverse tables (simplified - actual implementation would use Power Platform CLI)
$dataverseSchema = Get-Content ".\config\dataverse-schema.json" | ConvertFrom-Json

Write-Host "Dataverse schema loaded with $($dataverseSchema.tables.Count) tables" -ForegroundColor Green

# Step 5: Configure Conditional Access Policies
Write-Host "Configuring Conditional Access..." -ForegroundColor Yellow

foreach ($policy in $entraConfig.conditionalAccess.policies) {
    $caPolicy = @{
        displayName = $policy.displayName
        state = $policy.state
        conditions = $policy.conditions
        grantControls = $policy.grantControls
    }
    
    try {
        $caPolicyResult = Invoke-MgGraphRequest -Method POST -Uri "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies" -Body ($caPolicy | ConvertTo-Json -Depth 10)
        Write-Host "Conditional Access Policy created: $($policy.displayName)" -ForegroundColor Green
    }
    catch {
        Write-Warning "Failed to create CA policy: $($policy.displayName) - $($_.Exception.Message)"
    }
}

# Step 6: Validation
if ($ValidateOnly -or -not $SkipInfrastructure) {
    Write-Host "Running Validation Checks..." -ForegroundColor Yellow
    
    $validationResults = @{
        "SSO + MFA Enforced" = $false
        "VPN Profiles Deployed" = $false
        "eSIM Profiles Managed" = $false
        "Drive Auto-Register Functional" = $false
        "Power BI Dashboards Embedded" = $false
        "RBAC/PIM Roles Active" = $false
        "Immutable Audit Logs Exported" = $false
        "Bilingual UI Accessible" = $false
    }
    
    # Check SSO + MFA
    $mfaPolicy = Invoke-MgGraphRequest -Method GET -Uri "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies" | Where-Object { $_.displayName -like "*MFA*" }
    $validationResults["SSO + MFA Enforced"] = $mfaPolicy.Count -gt 0
    
    # Check VPN Profiles
    $vpnProfiles = Invoke-MgGraphRequest -Method GET -Uri "https://graph.microsoft.com/v1.0/deviceManagement/deviceConfigurations" | Where-Object { $_."@odata.type" -eq "#microsoft.graph.windows10VpnConfiguration" }
    $validationResults["VPN Profiles Deployed"] = $vpnProfiles.Count -gt 0
    
    # Display validation results
    Write-Host "`nValidation Results:" -ForegroundColor Cyan
    foreach ($check in $validationResults.GetEnumerator()) {
        $status = if ($check.Value) { "PASS" } else { "FAIL" }
        Write-Host "  $($check.Key): $status" -ForegroundColor $(if ($check.Value) { "Green" } else { "Red" })
    }
}

# Step 7: Generate Deployment Summary
$deploymentSummary = @{
    Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss UTC"
    Environment = $Environment
    TenantId = $TenantId
    SubscriptionId = $SubscriptionId
    AppRegistrationId = $appRegistration.AppId
    VPNProfileId = $vpnProfileResult.id
    CompliancePolicyId = $compliancePolicyResult.id
    ValidationResults = $validationResults
}

$deploymentSummary | ConvertTo-Json -Depth 10 | Out-File ".\deployment-summary-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"

Write-Host "`nNexoraSIM Enterprise Deployment Complete!" -ForegroundColor Green
Write-Host "Deployment summary saved to deployment-summary-$(Get-Date -Format 'yyyyMMdd-HHmmss').json" -ForegroundColor Cyan

# Disconnect sessions
Disconnect-MgGraph
Disconnect-AzAccount