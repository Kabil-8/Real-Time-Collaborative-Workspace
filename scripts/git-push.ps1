param(
  [Parameter(Mandatory=$false)]
  [string]$Message = "chore: update project"
)

Set-Location $PSScriptRoot/..

git add -A

git commit -m $Message

git push origin shivang
