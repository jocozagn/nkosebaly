# Crée le dépôt GitHub nkosebaly-app et pousse le code mobile.
# Prérequis : gh auth login (une fois)
# Usage : powershell -File scripts/create-mobile-github-repo.ps1

$ErrorActionPreference = "Stop"
$env:Path = "C:\Program Files\GitHub CLI;" + $env:Path

$mobileDir = "C:\eLMS\nkosebaly"
Set-Location $mobileDir

gh repo view jocozagn/-nkosebaly-app 2>$null | Out-Null

if ($LASTEXITCODE -ne 0) {
  gh repo create -nkosebaly-app `
    --public `
    --description "Karamoo Sebaly - app mobile Flutter Android/iOS"
}

if (git remote get-url origin 2>$null) {
  git remote remove origin
}

git remote add origin https://github.com/jocozagn/-nkosebaly-app.git
git push -u origin main

Write-Host "OK -> https://github.com/jocozagn/-nkosebaly-app"
