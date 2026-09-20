@echo off
TITLE DAITRA Boutique Server Launcher
echo ===================================================
echo     DAITRA Couture — Starting Application Server
echo ===================================================
echo.

:: Check if node_modules exists
IF NOT EXIST "node_modules" (
    echo [1/3] Installing dependencies...
    call npm install
) ELSE (
    echo [1/3] Dependencies found. Skipping npm install...
)

echo.
echo [2/3] Building production assets with Vite...
call npm run build

echo.
echo [3/3] Starting Express Server...
echo Server running at http://localhost:10000
echo Press Ctrl+C to stop the server.
echo.

start http://localhost:10000
node server.js
pause
