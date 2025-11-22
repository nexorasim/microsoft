param(
    [Parameter(Mandatory=$true)]
    [string]$Repository,
    
    [Parameter(Mandatory=$true)]
    [string]$Token
)

$headers = @{
    "Authorization" = "Bearer $Token"
    "Accept" = "application/vnd.github.v3+json"
    "Content-Type" = "application/json"
}

$protectionConfig = Get-Content ".github/branch-protection.json" | ConvertFrom-Json

$uri = "https://api.github.com/repos/$Repository/branches/main/protection"

try {
    Invoke-RestMethod -Uri $uri -Method Put -Headers $headers -Body ($protectionConfig | ConvertTo-Json -Depth 10)
    Write-Host "Branch protection rules applied successfully" -ForegroundColor Green
} catch {
    Write-Host "Failed to apply branch protection: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}