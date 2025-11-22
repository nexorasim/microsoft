param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("dev", "staging", "prod")]
    [string]$Environment,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipCarrierValidation
)

Write-Host "Validating NexoraSIM Enterprise Deployment" -ForegroundColor Green
Write-Host "Environment: $Environment" -ForegroundColor Cyan

$validationResults = @{
    "DomainValidation" = $false
    "CarrierConnectivity" = $false
    "SecurityHeaders" = $false
    "AccessibilityCompliance" = $false
    "BilingualContent" = $false
    "AuditLogging" = $false
}

# Domain validation
Write-Host "1. Validating domain configuration..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "https://portal.esim.com.mm" -Method Head -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        $validationResults.DomainValidation = $true
        Write-Host "   Domain validation: PASSED" -ForegroundColor Green
    }
} catch {
    Write-Host "   Domain validation: FAILED - $($_.Exception.Message)" -ForegroundColor Red
}

# Carrier connectivity validation
if (-not $SkipCarrierValidation) {
    Write-Host "2. Validating carrier connectivity..." -ForegroundColor Yellow
    $carriers = @("MPT", "ATOM", "U9", "MYTEL")
    $carrierResults = @()
    
    foreach ($carrier in $carriers) {
        try {
            $apiUrl = "https://api.portal.esim.com.mm/carriers/$carrier/health"
            $response = Invoke-RestMethod -Uri $apiUrl -Method Get -TimeoutSec 10
            $carrierResults += "$carrier: CONNECTED"
        } catch {
            $carrierResults += "$carrier: FAILED"
        }
    }
    
    if ($carrierResults -notcontains "FAILED") {
        $validationResults.CarrierConnectivity = $true
        Write-Host "   Carrier connectivity: PASSED" -ForegroundColor Green
    } else {
        Write-Host "   Carrier connectivity: FAILED" -ForegroundColor Red
        $carrierResults | ForEach-Object { Write-Host "     $_" -ForegroundColor Yellow }
    }
}

# Security headers validation
Write-Host "3. Validating security headers..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "https://portal.esim.com.mm" -Method Head
    $requiredHeaders = @(
        "Strict-Transport-Security",
        "X-Frame-Options", 
        "X-Content-Type-Options",
        "Content-Security-Policy"
    )
    
    $missingHeaders = @()
    foreach ($header in $requiredHeaders) {
        if (-not $response.Headers[$header]) {
            $missingHeaders += $header
        }
    }
    
    if ($missingHeaders.Count -eq 0) {
        $validationResults.SecurityHeaders = $true
        Write-Host "   Security headers: PASSED" -ForegroundColor Green
    } else {
        Write-Host "   Security headers: FAILED - Missing: $($missingHeaders -join ', ')" -ForegroundColor Red
    }
} catch {
    Write-Host "   Security headers: FAILED - $($_.Exception.Message)" -ForegroundColor Red
}

# Accessibility compliance validation
Write-Host "4. Validating accessibility compliance..." -ForegroundColor Yellow
if (Get-Command "axe" -ErrorAction SilentlyContinue) {
    try {
        $axeResult = axe "https://portal.esim.com.mm" --format json 2>$null | ConvertFrom-Json
        if ($axeResult.violations.Count -eq 0) {
            $validationResults.AccessibilityCompliance = $true
            Write-Host "   Accessibility compliance: PASSED" -ForegroundColor Green
        } else {
            Write-Host "   Accessibility compliance: FAILED - $($axeResult.violations.Count) violations" -ForegroundColor Red
        }
    } catch {
        Write-Host "   Accessibility compliance: SKIPPED - axe-core not available" -ForegroundColor Yellow
    }
} else {
    Write-Host "   Accessibility compliance: SKIPPED - axe-core not installed" -ForegroundColor Yellow
}

# Bilingual content validation
Write-Host "5. Validating bilingual content..." -ForegroundColor Yellow
$englishStrings = Get-Content "localization/en/ui-strings.json" -Raw | ConvertFrom-Json
$myanmarStrings = Get-Content "localization/my/ui-strings.json" -Raw | ConvertFrom-Json

if ($englishStrings -and $myanmarStrings) {
    $englishKeys = ($englishStrings | ConvertTo-Json -Depth 10 | ConvertFrom-Json -AsHashtable).Keys
    $myanmarKeys = ($myanmarStrings | ConvertTo-Json -Depth 10 | ConvertFrom-Json -AsHashtable).Keys
    
    if ($englishKeys.Count -eq $myanmarKeys.Count) {
        $validationResults.BilingualContent = $true
        Write-Host "   Bilingual content: PASSED" -ForegroundColor Green
    } else {
        Write-Host "   Bilingual content: FAILED - Key count mismatch" -ForegroundColor Red
    }
} else {
    Write-Host "   Bilingual content: FAILED - Missing localization files" -ForegroundColor Red
}

# Audit logging validation
Write-Host "6. Validating audit logging..." -ForegroundColor Yellow
try {
    $auditEndpoint = "https://api.portal.esim.com.mm/audit/health"
    $response = Invoke-RestMethod -Uri $auditEndpoint -Method Get -TimeoutSec 10
    if ($response.status -eq "healthy") {
        $validationResults.AuditLogging = $true
        Write-Host "   Audit logging: PASSED" -ForegroundColor Green
    }
} catch {
    Write-Host "   Audit logging: FAILED - $($_.Exception.Message)" -ForegroundColor Red
}

# Summary
Write-Host "`nValidation Summary:" -ForegroundColor Cyan
$passedCount = ($validationResults.Values | Where-Object { $_ -eq $true }).Count
$totalCount = $validationResults.Count

foreach ($validation in $validationResults.GetEnumerator()) {
    $status = if ($validation.Value) { "PASSED" } else { "FAILED" }
    $color = if ($validation.Value) { "Green" } else { "Red" }
    Write-Host "  $($validation.Key): $status" -ForegroundColor $color
}

Write-Host "`nOverall Status: $passedCount/$totalCount validations passed" -ForegroundColor Cyan

if ($passedCount -eq $totalCount) {
    Write-Host "DEPLOYMENT VALIDATION: PASSED" -ForegroundColor Green
    exit 0
} else {
    Write-Host "DEPLOYMENT VALIDATION: FAILED" -ForegroundColor Red
    exit 1
}