@echo off
title LAH Dev Stopper

echo ========================================================
echo   LAH System - Stopping Local Development Services
echo ========================================================
echo.
echo Stopping development processes on Port 80, 8080, 8081, 8082, 8085...

powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 80,8080,8081,8082,8085 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { $proc = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue; if ($proc) { $cmd = (Get-CimInstance Win32_Process -Filter ('ProcessId = ' + $proc.Id) -ErrorAction SilentlyContinue).CommandLine; $isPM2 = ($cmd -match 'ProcessContainer' -or $cmd -match 'pm2' -or $proc.ProcessName -eq 'php-cgi'); if ($_.LocalPort -eq 80 -and $proc.ProcessName -notmatch 'php') { Write-Host ('[SKIP] Port 80 is used by ' + $proc.ProcessName + ' (PID ' + $proc.Id + ') - Apache service preserved.') } elseif (($_.LocalPort -in 8081,8082,8085) -and $isPM2) { Write-Host ('[SKIP] Port ' + $_.LocalPort + ' is used by ' + $proc.ProcessName + ' (PID ' + $proc.Id + ') - PM2 managed service preserved.') } else { Write-Host ('Stopping PID ' + $proc.Id + ' (' + $proc.ProcessName + ') on Port ' + $_.LocalPort + '...'); Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue } } }"

echo.
echo ========================================================
echo   Development services stopped and ports released.
echo   You may close any remaining command prompt windows.
echo ========================================================
echo.
pause
