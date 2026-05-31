# Supabase env vars on Vercel — run after creating Supabase project
# Usage: .\scripts\set-vercel-supabase-env.ps1 -Url "https://xxx.supabase.co" -AnonKey "eyJ..."

param(
  [Parameter(Mandatory = $true)]
  [string]$Url,
  [Parameter(Mandatory = $true)]
  [string]$AnonKey
)

Set-Location "$PSScriptRoot\.."

Write-Host "Adding Vercel env vars for executive-flow..."
echo $Url | npx vercel env add VITE_SUPABASE_URL production
echo $AnonKey | npx vercel env add VITE_SUPABASE_ANON_KEY production
echo $Url | npx vercel env add VITE_SUPABASE_URL preview
echo $AnonKey | npx vercel env add VITE_SUPABASE_ANON_KEY preview

Write-Host "Redeploying production..."
npx vercel --prod --yes

Write-Host "Done. Open Sync & Backup tab and sign in."
