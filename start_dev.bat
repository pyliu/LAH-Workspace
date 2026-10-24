@echo off
title LAH Dev Starter

echo ========================================================
echo   LAH System - Starting Local Development Environment
echo ========================================================
echo.

set "ROOT=%~dp0"

if exist "C:\AppServ\node\node.exe" (
    set "PATH=C:\AppServ\node;%PATH%"
)

echo [1/4] Checking Port 80 for LAH-API...
powershell -NoProfile -Command "$c = Get-NetTCPConnection -LocalPort 80 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1; if ($c) { $p = Get-Process -Id $c.OwningProcess -ErrorAction SilentlyContinue; Write-Host ('      [NOTICE] Port 80 is ALREADY in use by ' + $p.ProcessName + ' (PID ' + $p.Id + ').'); exit 1 } else { exit 0 }"
if errorlevel 1 (
    echo       Skipping LAH-API PHP server startup.
) else (
    echo       Port 80 is available. Starting LAH-API on Port 80...
    start "LAH-API - PHP 80" /D "%ROOT%LAH-API\www" cmd /k "run_dev_http.bat"
)
echo.

echo [2/4] Checking Port 8085 for LAH-API-v85 [PHP 8.5 FastCGI]...
powershell -NoProfile -Command "$c = Get-NetTCPConnection -LocalPort 8085 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1; if ($c) { $p = Get-Process -Id $c.OwningProcess -ErrorAction SilentlyContinue; Write-Host ('      [NOTICE] Port 8085 is ALREADY in use by ' + $p.ProcessName + ' (PID ' + $p.Id + ').'); exit 1 } else { exit 0 }"
if errorlevel 1 (
    echo       Skipping LAH-API-v85 startup.
) else (
    echo       Port 8085 is available. Starting LAH-API-v85 on Port 8085...
    where pm2 >nul 2>&1
    if not errorlevel 1 (
        call pm2 start "%ROOT%LAH-API\API\ecosystem.config.js"
    ) else (
        start "LAH-API-v85 - PHP 8.5 8085" /D "%ROOT%LAH-API\API" "C:\AppServ\php85\php-cgi.exe" -b 127.0.0.1:8085 -c "C:\AppServ\php85\php.ini"
    )
)
echo.

echo [3/4] Checking Port 8080 for LAH-FE...
powershell -NoProfile -Command "$c = Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1; if ($c) { $p = Get-Process -Id $c.OwningProcess -ErrorAction SilentlyContinue; Write-Host ('      [NOTICE] Port 8080 is ALREADY in use by ' + $p.ProcessName + ' (PID ' + $p.Id + ').'); exit 1 } else { exit 0 }"
if errorlevel 1 (
    echo       Skipping LAH-FE startup.
) else (
    echo       Port 8080 is available. Starting LAH-FE on Port 8080...
    start "LAH-FE - Nuxt 8080" /D "%ROOT%LAH-FE" cmd /k "yarn dev"
)
echo.

echo [4/4] Checking Port 8081/8082 for lah-messenger-server...
powershell -NoProfile -Command "$c = Get-NetTCPConnection -LocalPort 8081,8082 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1; if ($c) { $p = Get-Process -Id $c.OwningProcess -ErrorAction SilentlyContinue; Write-Host ('      [NOTICE] Port ' + $c.LocalPort + ' is ALREADY in use by ' + $p.ProcessName + ' (PID ' + $p.Id + ').'); exit 1 } else { exit 0 }"
if errorlevel 1 (
    echo       Skipping lah-messenger-server startup.
) else (
    echo       Port 8081/8082 is available. Starting lah-messenger-server on Port 8081/8082...
    start "lah-messenger-server - WS 8081/8082" /D "%ROOT%lah-messenger-server" cmd /k "yarn dev"
)
echo.

echo ========================================================
echo   Services status:
echo   - LAH-API:              http://127.0.0.1:80 [Active or Existing Apache]
echo   - LAH-API (PHP 8.5):    http://127.0.0.1/LAH-API, fcgi://127.0.0.1:8085
echo   - LAH-FE:               http://127.0.0.1:8080
echo   - lah-messenger-server: ws://127.0.0.1:8081, http://127.0.0.1:8082
echo ========================================================
echo.
echo Opening browser http://127.0.0.1:8080 in 5 seconds...
ping 127.0.0.1 -n 6 >nul
start http://127.0.0.1:8080

echo.
echo Browser opened. Please keep the service windows running.
echo To stop development services, run stop_dev.bat
echo.
pause
