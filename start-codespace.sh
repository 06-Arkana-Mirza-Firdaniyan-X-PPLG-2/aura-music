#!/bin/bash
# Aura Music - Startup script for GitHub Codespaces
echo "======================================================="
echo "  AURA MUSIC - Starting server on GitHub Codespaces..."
echo "======================================================="

# Kill any existing server
pkill -f "node server.js" 2>/dev/null

# Start server in background
npm start > /tmp/aura-server.log 2>&1 &
SERVER_PID=$!

echo "Server started (PID: $SERVER_PID)"
echo "Waiting for server to be ready..."
sleep 3

# Check if server is running
if kill -0 $SERVER_PID 2>/dev/null; then
  echo "✅ Server is running!"
  echo ""
  echo "Your Aura Music URL will appear in the PORTS tab."
  echo "Make sure port 3000 visibility is set to PUBLIC."
  echo ""
  echo "To view logs: tail -f /tmp/aura-server.log"
else
  echo "❌ Server failed to start. Check logs:"
  cat /tmp/aura-server.log
fi
