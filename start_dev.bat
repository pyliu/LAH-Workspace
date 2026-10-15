@echo off
title LAH Dev Starter

echo ========================================================
echo   LAH System - Starting Local Development Environment
echo ========================================================
echo.

set "ROOT=%~dp0"

echo [1/3] Checking Port 80 for LAH-API...
powershell -NoProfile -Command "if (Get-NetTCPConnection -LocalPort 80 -State Listen -ErrorAction SilentlyContinue) { exit 1 } else { exit 0 }"
if errorlevel 1 (
    echo       [NOTICE] Port 80 is ALREADY in use [Apache/IIS service detected].
    echo       Skipping LAH-API PHP server startup.
) else (
    echo       Port 80 is available. Starting LAH-API on Port 80...
    start "LAH-API - PHP 80" /D "%ROOT%LAH-API\www" cmd /k "run_dev_http.bat"
)
echo.

echo [2/3] Starting LAH-FE [Nuxt 2 Frontend on Port 8080]...
start "LAH-FE - Nuxt 8080" /D "%ROOT%LAH-FE" cmd /k "yarn dev"
echo.

echo [3/3] Starting lah-messenger-server [WebSocket on Port 8081/8082]...
start "lah-messenger-server - WS 8081/8082" /D "%ROOT%lah-messenger-server" cmd /k "yarn dev"
echo.

echo ========================================================
echo   Services status:
echo   - LAH-API:              http://127.0.0.1:80 [Active or Existing Apache]
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