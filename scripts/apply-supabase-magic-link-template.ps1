<#
.SYNOPSIS
  Applies Executive Flow Magic Link email template (with {{ .Token }} OTP) to Supabase Auth.

.NOTES
  Requires a Supabase Personal Access Token:
  https://supabase.com/dashboard/account/tokens

  Usage:
    $env:SUPABASE_ACCESS_TOKEN = "sbp_..."
    powershell -File scripts/apply-supabase-magic-link-template.ps1
#>

$ErrorActionPreference = 'Stop'

$ProjectRef = 'wnvxakzxmmieorogvufb'
$Token = $env:SUPABASE_ACCESS_TOKEN
if (-not $Token) {
  Write-Host 'ERROR: Set SUPABASE_ACCESS_TOKEN first (Dashboard → Account → Access Tokens).' -ForegroundColor Red
  exit 1
}

$templatePath = Join-Path $PSScriptRoot '..\supabase\email-templates\magic-link.html'
$html = Get-Content -Path $templatePath -Raw -Encoding UTF8

# Management API expects a single-line / escaped HTML string in JSON
$bodyObj = @{
  mailer_subjects_magic_link     = '{{ .Token }} is your Executive Flow login code'
  mailer_templates_magic_link_content = $html
}

$json = $bodyObj | ConvertTo-Json -Compress
$uri = "https://api.supabase.com/v1/projects/$ProjectRef/config/auth"

Write-Host "PATCH $uri ..."
$res = Invoke-RestMethod -Method Patch -Uri $uri -Headers @{
  Authorization = "Bearer $Token"
  'Content-Type' = 'application/json'
} -Body $json

Write-Host 'OK — Magic Link template updated with {{ .Token }}.' -ForegroundColor Green
if ($res.mailer_subjects_magic_link) {
  Write-Host ("Subject: " + $res.mailer_subjects_magic_link)
}
