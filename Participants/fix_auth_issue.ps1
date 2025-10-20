# Quick Fix Script for NDIS Appointments Authentication
# Run this in PowerShell from project root

Write-Host "🔧 Applying Authentication Fixes..." -ForegroundColor Green

# Step 1: Backup files
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = ".\backups\$timestamp"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

Write-Host "📦 Creating backups in $backupDir..."

# Files to check/fix
$filesToCheck = @(
    "frontend\src\lib\api\scheduling.ts",
    "frontend\src\components\ParticipantAppointmentsTab.tsx",
    "frontend\src\lib\api\client.ts"
)

foreach ($file in $filesToCheck) {
    if (Test-Path $file) {
        Copy-Item $file -Destination $backupDir
        Write-Host "  ✅ Backed up: $file"
    } else {
        Write-Host "    Not found: $file" -ForegroundColor Yellow
    }
}

Write-Host "
 Files that need manual review:"
Write-Host "1. frontend/src/lib/api/scheduling.ts - Add auth headers"
Write-Host "2. frontend/src/components/ParticipantAppointmentsTab.tsx - Verify auth context"
Write-Host "
Backups saved to: $backupDir"
