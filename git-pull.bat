@echo off
chcp 65001 >nul
powershell -NoProfile -ExecutionPolicy Bypass -Command "if (Test-Path '.git') { Write-Host '=== Updating Current (Root) ===' -ForegroundColor Green; git pull }; Get-ChildItem -Directory | ForEach-Object { if (Test-Path \"$($_.FullName)\.git\") { Write-Host \"`n=== Updating $($_.Name) ===\" -ForegroundColor Cyan; git -C $_.FullName pull } }"
pause