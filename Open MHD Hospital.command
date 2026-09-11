#!/bin/zsh

cd "$(dirname "$0")" || exit 1

if ! command -v node >/dev/null 2>&1; then
  osascript -e 'display alert "Node.js is required" message "Install Node.js from https://nodejs.org, then try again."'
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "Installing dependencies..."
  npm install || exit 1
fi

URL="http://127.0.0.1:3000/"
if curl --silent --fail --max-time 2 "$URL" >/dev/null 2>&1; then
  open "$URL"
  exit 0
fi

LOG_FILE="${TMPDIR:-/tmp}/mhd-hospital-dev.log"
nohup npm run dev >"$LOG_FILE" 2>&1 < /dev/null &
SERVER_PID=$!

for attempt in {1..40}; do
  if curl --silent --fail --max-time 1 "$URL" >/dev/null 2>&1; then
    open "$URL"
    echo "MHD Hospital is running at $URL"
    echo "Log: $LOG_FILE"
    exit 0
  fi
  sleep 0.25
done

echo "MHD Hospital did not start. Opening the error log..."
open -a TextEdit "$LOG_FILE"
exit 1
