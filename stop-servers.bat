@echo off
REM 🛑 Rabbit Launchpad - Server Stop Script (Windows)
REM Script untuk menghentikan semua server

echo 🛑 Stopping Rabbit Launchpad Servers...

REM Kill Node.js processes on our ports
echo 🛑 Stopping servers...

REM Kill processes on ports 3001, 8081, and 8080
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3001\|:8081\|:8080"') do (
    echo 🛑 Killing process %%a...
    taskkill /F /PID %%a >nul 2>&1
)

echo ✅ All servers stopped successfully!
echo 📝 Logs are still available in the 'logs' directory
echo.
pause