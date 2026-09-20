# DAITRA Boutique Server Launcher (PowerShell)
Write-Host "===================================================" -ForegroundColor Gold
Write-Host "    DAITRA Couture — Starting Application Server" -ForegroundColor Yellow
Write-Host "===================================================" -ForegroundColor Gold
Write-Host ""

$scriptDir = Split-Path -Path $MyInvocation.MyCommand.Definition -Parent
Set-Location -Path $scriptDir

# Check node_modules
if (-not (Test-Path "node_modules")) {
    Write-Host "[1/3] Installing dependencies..." -ForegroundColor Cyan
    npm install
} else {
    Write-Host "[1/3] Dependencies found." -ForegroundColor Green
}

Write-Host ""
Write-Host "[2/3] Building production assets with Vite..." -ForegroundColor Cyan
npm run build

Write-Host ""
Write-Host "[3/3] Starting Express Server at http://localhost:10000 ..." -ForegroundColor Green
Write-Host "Press Ctrl+C to stop the server." -ForegroundColor Yellow
Write-Host ""

# Launch default web browser
Start-Process "http://localhost:10000"

# Run node server
node server.js
