@echo off
REM 🚀 Rabbit Launchpad - Complete Server Startup Script (Windows)
REM Script untuk menjalankan semua server yang dibutuhkan

echo 🚀 Starting Rabbit Launchpad Servers...

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

REM Create logs directory
if not exist logs mkdir logs

echo 🔥 Starting servers...

REM Start Backend API Server (Port 3001)
echo 🔥 Starting Backend API Server on port 3001...
cd backend
start /B cmd /c "npm run dev > ..\logs\backend.log 2>&1"
cd ..
echo Backend started...

REM Wait for backend to start
echo ⏳ Waiting for backend to start...
timeout /t 5 /nobreak >nul

REM Start WebSocket Server (Port 8081)
echo 🔥 Starting WebSocket Server on port 8081...
cd backend
start /B cmd /c "npm run websocket > ..\logs\websocket.log 2>&1"
cd ..
echo WebSocket started...

REM Wait for WebSocket to start
echo ⏳ Waiting for WebSocket server to start...
timeout /t 3 /nobreak >nul

REM Start Frontend Development Server (Port 8080)
echo 🔥 Starting Frontend Development Server on port 8080...
cd frontend
start /B cmd /c "npm run dev > ..\logs\frontend.log 2>&1"
cd ..
echo Frontend started...

echo ✅ All servers started successfully!
echo 📊 Backend API: http://localhost:3001
echo 🔌 WebSocket: ws://localhost:8081
echo 🌐 Frontend: http://localhost:8080
echo.
echo 📝 Logs are available in the 'logs' directory
echo 🛑 To stop all servers, run: stop-servers.bat
echo.
echo ⏳ Waiting 10 seconds before opening browser...
timeout /t 10 /nobreak >nul

REM Open browser
start http://localhost:8080

echo 🌐 Browser opened to http://localhost:8080
echo.
echo 📊 Servers are running in the background.
echo 🛑 To stop all servers, run: stop-servers.bat
echo.
pause