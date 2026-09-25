# Add VITE_MSAL_CLIENT_ID to Vercel for Outlook Graph auto-push.
# Azure: https://portal.azure.com → App registrations → New (SPA)
# Redirect: https://executive-flow-seven.vercel.app + http://localhost:5173
# Permission: Microsoft Graph delegated Calendars.ReadWrite

param(
  [string]$ClientId = "",
  [string]$TenantId = "common"
)

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

if (-not $ClientId) {
  $localEnv = Join-Path $PWD ".env.local"
  if (Test-Path $localEnv) {
    $match = Select-String -Path $localEnv -Pattern '^\s*VITE_MSAL_CLIENT_ID\s*=\s*(.+)\s*$' | Select-Object -First 1
    if ($match) {
      $candidate = $match.Matches[0].Groups[1].Value.Trim().Trim('"').Trim("'")
      if ($candidate -and $candidate -notmatch 'xxxx|your-azure') {
        $ClientId = $candidate
      }
    }
  }
}

if (-not $ClientId) {
  Write-Host ""
  Write-Host "Azure App (SPA) Client ID chahiye:" -ForegroundColor Yellow
  Write-Host "  https://portal.azure.com → Microsoft Entra ID → App registrations" -ForegroundColor Yellow
  $ClientId = Read-Host "VITE_MSAL_CLIENT_ID paste karein"
}

if (-not $ClientId) {
  Write-Error "VITE_MSAL_CLIENT_ID empty. Aborting."
}

Write-Host "Adding VITE_MSAL_CLIENT_ID to Vercel (production + preview)..." -ForegroundColor Cyan
$ClientId | npx vercel env add VITE_MSAL_CLIENT_ID production
$ClientId | npx vercel env add VITE_MSAL_CLIENT_ID preview

if ($TenantId) {
  Write-Host "Adding VITE_MSAL_TENANT_ID=$TenantId ..." -ForegroundColor Cyan
  $TenantId | npx vercel env add VITE_MSAL_TENANT_ID production
  $TenantId | npx vercel env add VITE_MSAL_TENANT_ID preview
}

$localPath = Join-Path $PWD ".env.local"
$line = "VITE_MSAL_CLIENT_ID=$ClientId"
$tenantLine = "VITE_MSAL_TENANT_ID=$TenantId"
if (Test-Path $localPath) {
  $content = Get-Content $localPath -Raw
  if ($content -match '(?m)^VITE_MSAL_CLIENT_ID=') {
    $content = $content -replace '(?m)^VITE_MSAL_CLIENT_ID=.*$', $line
  } else {
    $content = $content.TrimEnd() + "`n" + $line
  }
  if ($content -match '(?m)^VITE_MSAL_TENANT_ID=') {
    $content = $content -replace '(?m)^VITE_MSAL_TENANT_ID=.*$', $tenantLine
  } else {
    $content = $content.TrimEnd() + "`n" + $tenantLine
  }
  Set-Content -Path $localPath -Value $content.TrimEnd() -NoNewline
} else {
  Set-Content -Path $localPath -Value "$line`n$tenantLine"
}

Write-Host ""
Write-Host "Done. Redeploy chahiye (Vite embeds VITE_* at build time):" -ForegroundColor Green
Write-Host "  npx vercel deploy --prod --yes" -ForegroundColor Green
