#!/bin/bash
# ============================================
#  MHD Hospital — one-click launcher (Mac)
#  Double-click this file to start the app.
#  Works no matter where this file is kept.
# ============================================
cd "$(dirname "$0")" || exit 1

# If the app is already running, just open it
if curl -s -o /dev/null --max-time 2 http://localhost:3000/; then
  open "http://localhost:3000"
  exit 0
fi

echo "Starting MHD Hospital... (first start takes a few seconds)"
npm run dev -- --open > /tmp/mhd-hospital-dev.log 2>&1 &

# Wait for the server, then open the browser
for i in $(seq 1 30); do
  if curl -s -o /dev/null --max-time 1 http://localhost:3000/; then
    open "http://localhost:3000"
    echo ""
    echo "✅ MHD Hospital is running at http://localhost:3000"
    echo "   KEEP THIS WINDOW OPEN while you use the app."
    echo "   Your code edits appear automatically in the browser."
    echo ""
    echo "   To STOP the app: press any key here."
    break
  fi
  sleep 1
done

echo "Press any key to STOP the server..."
read -n 1
pkill -f "vite --port=3000" 2>/dev/null
echo "Server stopped."
