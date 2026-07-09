# Crée le dépôt GitHub nkosebaly-app et pousse le code mobile.
# Prérequis : gh auth login (une fois)
# Usage : powershell -File scripts/create-mobile-github-repo.ps1

$ErrorActionPreference = "Stop"
$env:Path = "C:\Program Files\GitHub CLI;" + $env:Path

$mobileDir = "C:\eLMS\nkosebaly"
Set-Location $mobileDir

gh auth status | Out-Null

if (git remote get-url origin 2>$null) {
  git remote remove origin
}

gh repo create nkosebaly-app `
  --public `
  --description "Karamoo Sebaly - app mobile Flutter Android/iOS" `
  --source=. `
  --remote=origin `
  --push

Write-Host "OK -> https://github.com/jocozagn/nkosebaly-app"
