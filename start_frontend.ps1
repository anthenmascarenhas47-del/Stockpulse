Set-StrictMode -Version Latest
$here = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $here

Write-Host "Installing frontend dependencies..." -ForegroundColor Cyan
Write-Host "Installing frontend dependencies..." -ForegroundColor Cyan
npm install --no-audit --no-fund

Write-Host "Starting Vite dev server..." -ForegroundColor Green
Write-Host "Starting Vite dev server..." -ForegroundColor Green
npm run dev
