#!/bin/bash

# 🚀 Rabbit Launchpad - Complete Server Startup Script
# Script untuk menjalankan semua server yang dibutuhkan

echo "🚀 Starting Rabbit Launchpad Servers..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if dependencies are installed
echo "📦 Checking dependencies..."

if [ ! -d "backend/node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    cd backend && npm install && cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd frontend && npm install && cd ..
fi

# Create logs directory
mkdir -p logs

echo "🔥 Starting servers..."

# Start Backend API Server (Port 3001)
echo "🔥 Starting Backend API Server on port 3001..."
cd backend
npm run dev > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"
cd ..

# Wait for backend to start
echo "⏳ Waiting for backend to start..."
sleep 5

# Start WebSocket Server (Port 8081)
echo "🔥 Starting WebSocket Server on port 8081..."
cd backend
npm run websocket > ../logs/websocket.log 2>&1 &
WEBSOCKET_PID=$!
echo "WebSocket PID: $WEBSOCKET_PID"
cd ..

# Wait for WebSocket to start
echo "⏳ Waiting for WebSocket server to start..."
sleep 3

# Start Frontend Development Server (Port 8080)
echo "🔥 Starting Frontend Development Server on port 8080..."
cd frontend
npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"
cd ..

# Save PIDs to file for later cleanup
echo "$BACKEND_PID" > logs/backend.pid
echo "$WEBSOCKET_PID" > logs/websocket.pid
echo "$FRONTEND_PID" > logs/frontend.pid

echo "✅ All servers started successfully!"
echo "📊 Backend API: http://localhost:3001"
echo "🔌 WebSocket: ws://localhost:8081"
echo "🌐 Frontend: http://localhost:8080"
echo ""
echo "📝 Logs are available in the 'logs' directory"
echo "🛑 To stop all servers, run: ./stop-servers.sh"
echo ""
echo "⏳ Waiting 10 seconds before opening browser..."
sleep 10

# Open browser
if command -v start &> /dev/null; then
    start http://localhost:8080
elif command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:8080
elif command -v open &> /dev/null; then
    open http://localhost:8080
fi

echo "🌐 Browser opened to http://localhost:8080"

# Monitor servers
echo "📊 Monitoring servers... Press Ctrl+C to stop all servers"
trap 'echo "🛑 Stopping all servers..."; ./stop-servers.sh; exit' INT

while true; do
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        echo "❌ Backend server died!"
        break
    fi
    if ! kill -0 $WEBSOCKET_PID 2>/dev/null; then
        echo "❌ WebSocket server died!"
        break
    fi
    if ! kill -0 $FRONTEND_PID 2>/dev/null; then
        echo "❌ Frontend server died!"
        break
    fi
    sleep 5
done