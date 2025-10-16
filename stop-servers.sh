#!/bin/bash

# 🛑 Rabbit Launchpad - Server Stop Script
# Script untuk menghentikan semua server

echo "🛑 Stopping Rabbit Launchpad Servers..."

# Function to stop process by PID file
stop_process() {
    local pid_file=$1
    local name=$2

    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            echo "🛑 Stopping $name (PID: $pid)..."
            kill "$pid"
            sleep 2
            if kill -0 "$pid" 2>/dev/null; then
                echo "🔨 Force killing $name..."
                kill -9 "$pid"
            fi
            echo "✅ $name stopped"
        else
            echo "ℹ️  $name was not running"
        fi
        rm "$pid_file"
    else
        echo "ℹ️  No PID file found for $name"
    fi
}

# Stop all servers
stop_process "logs/backend.pid" "Backend API Server"
stop_process "logs/websocket.pid" "WebSocket Server"
stop_process "logs/frontend.pid" "Frontend Development Server"

# Kill any remaining Node processes on our ports
echo "🧹 Cleaning up any remaining processes..."

# Kill processes on ports 3001, 8081, and 8080
if command -v lsof &> /dev/null; then
    for port in 3001 8081 8080; do
        local pids=$(lsof -ti:$port 2>/dev/null)
        if [ ! -z "$pids" ]; then
            echo "🛑 Killing processes on port $port..."
            echo "$pids" | xargs kill -9
        fi
    done
fi

echo "✅ All servers stopped successfully!"
echo "📝 Logs are still available in the 'logs' directory"