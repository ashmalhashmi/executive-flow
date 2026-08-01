# Add GEMINI_API_KEY to Vercel for Contact Capture flow.
# Get a free key: https://aistudio.google.com/apikey

param(
  [string]$Key = ""
)

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

if (-not $Key) {
  $localEnv = Join-Path $PWD ".env.local"
  if (Test-Path $localEnv) {
    $match = Select-String -Path $localEnv -Pattern '^\s*GEMINI_API_KEY\s*=\s*(.+)\s*$' | Select-Object -First 1
    if ($match) {
      $candidate = $match.Matches[0].Groups[1].Value.Trim().Trim('"').Trim("'")
      $placeholders = @('YAHAN_NOTEPAD_SE_KEY_PASTE', 'your-gemini-api-key', 'paste', '')
      if ($candidate -and ($placeholders -notcontains $candidate)) {
        $Key = $candidate
      }
    }
  }
}

if (-not $Key) {
  Write-Host ""
  Write-Host "Gemini API key: https://aistudio.google.com/apikey" -ForegroundColor Yellow
  $Key = Read-Host "GEMINI_API_KEY paste karein"
}

if (-not $Key) {
  Write-Error "GEMINI_API_KEY empty. Aborting."
}

Write-Host "Adding GEMINI_API_KEY to Vercel..." -ForegroundColor Cyan
$Key | npx vercel env add GEMINI_API_KEY production
$Key | npx vercel env add GEMINI_API_KEY preview

$localPath = Join-Path $PWD ".env.local"
$line = "GEMINI_API_KEY=$Key"
if (Test-Path $localPath) {
  $content = Get-Content $localPath -Raw
  if ($content -match '(?m)^GEMINI_API_KEY=') {
    $content = $content -replace '(?m)^GEMINI_API_KEY=.*$', $line
    Set-Content -Path $localPath -Value $content.TrimEnd() -NoNewline
  } else {
    Add-Content -Path $localPath -Value ""
    Add-Content -Path $localPath -Value $line
  }
} else {
  Set-Content -Path $localPath -Value $line
}

Write-Host ""
Write-Host "Done. Ab ye chalao: npx vercel deploy --prod --yes" -ForegroundColor Green
