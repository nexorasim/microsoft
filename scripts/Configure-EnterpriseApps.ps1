# Configure NexoraSIM Enterprise Applications
param(
    [Parameter(Mandatory=$true)]
    [string]$TenantId = "d7ff8066-4e28-4170-9805-b60ec642c442"
)

Connect-MgGraph -TenantId $TenantId -Scopes "Application.ReadWrite.All", "Directory.ReadWrite.All", "AppRoleAssignment.ReadWrite.All"

Write-Host "Configuring NexoraSIM Enterprise Applications" -ForegroundColor Green

# Main NexoraSIM Application
$mainAppId = "40594035-9169-4ff7-9422-9728a141f5a2"
$mainSpId = "f180e99b-e1de-4648-98f8-050ee89464bd"

# Configure Service Principal
$spConfig = @{
    AppRoleAssignmentRequired = $true
    PreferredSingleSignOnMode = "oidc"
    LoginUrl = "https://nexorasim.powerappsportals.com"
    LogoutUrl = "https://nexorasim.powerappsportals.com/logout"
    Tags = @("WindowsAzureActiveDirectoryIntegratedApp")
}

Update-MgServicePrincipal -ServicePrincipalId $mainSpId -BodyParameter $spConfig
Write-Host "Service Principal configured: $mainSpId" -ForegroundColor Green

# Get Security Groups
$enterpriseUsersGroup = Get-MgGroup -Filter "displayName eq 'NexoraSIM Enterprise Users'"
$esimOperatorsGroup = Get-MgGroup -Filter "displayName eq 'NexoraSIM eSIM Operators'"
$esimAdminsGroup = Get-MgGroup -Filter "displayName eq 'NexoraSIM eSIM Administrators'"

# Assign Groups to Application
if ($enterpriseUsersGroup) {
    $assignment = @{
        PrincipalId = $enterpriseUsersGroup.Id
        ResourceId = $mainSpId
        AppRoleId = "00000000-0000-0000-0000-000000000000"
    }
    New-MgServicePrincipalAppRoleAssignment -ServicePrincipalId $mainSpId -BodyParameter $assignment
    Write-Host "Assigned Enterprise Users group" -ForegroundColor Green
}

if ($esimOperatorsGroup) {
    $assignment = @{
        PrincipalId = $esimOperatorsGroup.Id
        ResourceId = $mainSpId
        AppRoleId = "00000000-0000-0000-0000-000000000000"
    }
    New-MgServicePrincipalAppRoleAssignment -ServicePrincipalId $mainSpId -BodyParameter $assignment
    Write-Host "Assigned eSIM Operators group" -ForegroundColor Green
}

if ($esimAdminsGroup) {
    $assignment = @{
        PrincipalId = $esimAdminsGroup.Id
        ResourceId = $mainSpId
        AppRoleId = "00000000-0000-0000-0000-000000000000"
    }
    New-MgServicePrincipalAppRoleAssignment -ServicePrincipalId $mainSpId -BodyParameter $assignment
    Write-Host "Assigned eSIM Administrators group" -ForegroundColor Green
}

Write-Host "Enterprise Applications configuration complete" -ForegroundColor Green
Disconnect-MgGraph