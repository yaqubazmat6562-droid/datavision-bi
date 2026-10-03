# ==========================================
# Move all engine files to engines/ folder
# ==========================================

$engineFiles = @(
    "cleaner.py",
    "explorer.py",
    "dashboard_engine.py",
    "query_engine.py",
    "summary_engine.py"
)

Write-Host "`n--- Checking and moving engine files ---`n" -ForegroundColor Cyan

foreach ($file in $engineFiles) {
    $target = "engines\$file"
    
    # If already in engines/, skip
    if (Test-Path $target) {
        Write-Host "[OK] $target already exists" -ForegroundColor Green
        continue
    }
    
    # If in root
    if (Test-Path $file) {
        Move-Item $file $target -Force
        Write-Host "[MOVED] $file -> $target" -ForegroundColor Yellow
        continue
    }
    
    # If in engine/ folder
    $enginePath = "engine\$file"
    if (Test-Path $enginePath) {
        Move-Item $enginePath $target -Force
        Write-Host "[MOVED] $enginePath -> $target" -ForegroundColor Yellow
        continue
    }
    
    # Not found anywhere
    Write-Host "[MISSING] $file not found anywhere!" -ForegroundColor Red
}

Write-Host "`n--- Final engines/ folder contents ---`n" -ForegroundColor Cyan
dir engines