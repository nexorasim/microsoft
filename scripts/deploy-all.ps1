param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("dev", "staging", "prod")]
    [string]$Environment,
    
    [Parameter(Mandatory=$false)]
    [string]$TenantId = "d7ff8066-4e28-4170-9805-b60ec642c442",
    
    [Parameter(Mandatory=$false)]
    [string]$Version = "1.0.0",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipTests
)

Write-Host "NexoraSIM Enterprise Deployment Started" -ForegroundColor Green
Write-Host "Environment: $Environment" -ForegroundColor Cyan
Write-Host "Version: $Version" -ForegroundColor Cyan
Write-Host "Tenant ID: $TenantId" -ForegroundColor Cyan

# Security check - ensure we're authenticated
if (-not (az account show 2>$null)) {
    Write-Host "Error: Not authenticated to Azure. Please run 'az login' first." -ForegroundColor Red
    exit 1
}

# Step 1: Verify Prerequisites
Write-Host "1. Verifying prerequisites..." -ForegroundColor Yellow
$tools = @("az", "git", "node", "docker")
foreach ($tool in $tools) {
    try {
        & $tool --version | Out-Null
        Write-Host "  $tool: OK" -ForegroundColor Green
    } catch {
        Write-Host "  $tool: MISSING" -ForegroundColor Red
    }
}

# Step 2: Create Resource Group
Write-Host "2. Creating Azure Resource Group..." -ForegroundColor Yellow
try {
    az group create --name "nexorasim-$Environment-rg" --location "East US" --output none
    Write-Host "  Resource group created" -ForegroundColor Green
} catch {
    Write-Host "  Resource group creation failed - may already exist" -ForegroundColor Yellow
}

# Step 3: Deploy Infrastructure
Write-Host "3. Deploying Azure infrastructure..." -ForegroundColor Yellow
$deploymentName = "nexorasim-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
az deployment group create `
    --resource-group "nexorasim-$Environment-rg" `
    --template-file "infra/main.bicep" `
    --parameters environment=$Environment tenantId=$TenantId `
    --name $deploymentName `
    --output none

# Step 4: Configure Cloudflare
Write-Host "4. Configuring Cloudflare Workers..." -ForegroundColor Yellow
Set-Location "infra/cloudflare"
if (Get-Command "wrangler" -ErrorAction SilentlyContinue) {
    wrangler deploy
    Write-Host "  Cloudflare Worker deployed" -ForegroundColor Green
} else {
    Write-Host "  Wrangler not installed - skipping Cloudflare deployment" -ForegroundColor Yellow
}
Set-Location "../.."

# Step 5: Health Check
Write-Host "5. Performing health checks..." -ForegroundColor Yellow
$endpoints = @(
    "https://nexorasim-$Environment-func.azurewebsites.net",
    "https://app.nexorasim.workers.dev"
)

foreach ($endpoint in $endpoints) {
    try {
        $response = Invoke-WebRequest -Uri "$endpoint/health" -Method GET -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            Write-Host "  $endpoint: HEALTHY" -ForegroundColor Green
        }
    } catch {
        Write-Host "  $endpoint: NOT RESPONDING" -ForegroundColor Yellow
    }
}

Write-Host "NexoraSIM Enterprise Deployment Complete" -ForegroundColor Green
Write-Host "Portal URL: https://portal.nexorasim.com" -ForegroundColor Cyan
Write-Host "API Gateway: https://app.nexorasim.workers.dev" -ForegroundColor Cyan