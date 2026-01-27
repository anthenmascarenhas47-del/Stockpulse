<#
Automated script to create a venv (if missing), install requirements, and start the backend.
Run this script from PowerShell (may prompt for permission to run pip installs).
#>
Set-StrictMode -Version Latest
$here = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $here

Write-Host "Starting Stockpulse backend helper..." -ForegroundColor Cyan
Write-Host "Attempting to start the real backend (main.py). If it fails, mock server will be used." -ForegroundColor Yellow

# Try importing main; if it fails, start mock_main instead. This avoids venv creation failures
# in environments where creating a virtualenv is problematic.
$importCmd = "import importlib,sys
try:
    importlib.import_module('main')
    sys.exit(0)
except Exception:
    sys.exit(1)
"
python -c $importCmd
if ($LASTEXITCODE -eq 0) {
    Write-Host "Starting real backend (main:app) on 0.0.0.0:8000" -ForegroundColor Green
    python -m uvicorn main:app --host 0.0.0.0 --port 8000 --log-level info
} else {
    Write-Host "Failed to import main.py — starting mock backend (mock_main:app) on 0.0.0.0:8000" -ForegroundColor Yellow
    python -m uvicorn mock_main:app --host 0.0.0.0 --port 8000 --log-level info
}
