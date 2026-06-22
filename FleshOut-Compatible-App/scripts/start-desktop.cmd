@echo off
setlocal
set "SCRIPT_DIR=%~dp0"
for %%I in ("%SCRIPT_DIR%..") do set "APP_DIR=%%~fI"
cd /d "%APP_DIR%"
set "FLESHOUT_DESKTOP=1"
set "NODE_ENV=production"
set "PORT=5178"
set "LOG_DIR=%APP_DIR%\logs"
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"
start "" /min "%APP_DIR%\runtime\node.exe" "%APP_DIR%\server\index.js" 1>"%LOG_DIR%\server.out.log" 2>"%LOG_DIR%\server.err.log"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$url='http://127.0.0.1:5178'; for($i=0;$i -lt 60;$i++){ try { $r=Invoke-WebRequest -UseBasicParsing -Uri ($url + '/api/health') -TimeoutSec 1; if($r.StatusCode -eq 200){ Start-Process $url; exit 0 } } catch {}; Start-Sleep -Milliseconds 500 }; Start-Process $url"
endlocal
