# update-versions.ps1 - PowerShell script to update version numbers
param(
    [string]$Version = (Get-Date -Format "yyyyMMddHHmm")
)

$files = @(
    "js\renderer.js",
    "index.html", 
    "test-edge-creation.html",
    "test-selection-fix.html"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        $content = $content -replace '\?v=\d+', "?v=$Version"
        Set-Content $file $content -NoNewline
        Write-Host "Updated $file to version $Version"
    }
}

Write-Host "All files updated to version $Version"
