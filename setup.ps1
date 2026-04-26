# SCR-Mesh — local folder scaffolder (Windows PowerShell)
# Usage:  .\setup.ps1 [-Target <path>]
# Example: .\setup.ps1 -Target C:\Projects\scr-mesh

param(
    [string]$Target = ".\scr-mesh"
)

Write-Host "Creating SCR-Mesh project structure at: $Target" -ForegroundColor Cyan

$dirs = @(
    "apps\web-admin",
    "apps\web-public",
    "apps\mobile",
    "services\ai-detection",
    "services\gemini-orchestrator",
    "services\mesh-coordinator",
    "firebase\functions",
    "shared\types",
    "shared\constants",
    "shared\playbooks",
    "docs"
)

foreach ($d in $dirs) {
    $full = Join-Path $Target $d
    New-Item -ItemType Directory -Force -Path $full | Out-Null
    New-Item -ItemType File -Force -Path (Join-Path $full ".gitkeep") | Out-Null
}

Write-Host ""
Write-Host "Done. Structure created:" -ForegroundColor Green
Get-ChildItem -Path $Target -Recurse -Directory | Select-Object FullName | Format-Table -AutoSize

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. cd $Target"
Write-Host "  2. git init"
Write-Host "  3. Open this folder in Google Antigravity"
Write-Host "  4. Paste Prompt 0.1 from the Antigravity Agent Prompts document"
