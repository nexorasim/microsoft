Write-Host "Setting up NexoraSIM Enterprise Development Environment" -ForegroundColor Green

# Install required tools
if (-not (Get-Command "dotnet" -ErrorAction SilentlyContinue)) {
    Write-Host "Installing .NET 8 SDK..." -ForegroundColor Yellow
    winget install Microsoft.DotNet.SDK.8
}

if (-not (Get-Command "func" -ErrorAction SilentlyContinue)) {
    Write-Host "Installing Azure Functions Core Tools..." -ForegroundColor Yellow
    npm install -g azure-functions-core-tools@4 --unsafe-perm true
}

# Restore packages
Write-Host "Restoring NuGet packages..." -ForegroundColor Yellow
dotnet restore app/entitlement-server/

# Build solution
Write-Host "Building solution..." -ForegroundColor Yellow
dotnet build app/entitlement-server/

Write-Host "Development environment ready!" -ForegroundColor Green
Write-Host "Run: func start --csharp" -ForegroundColor Cyan