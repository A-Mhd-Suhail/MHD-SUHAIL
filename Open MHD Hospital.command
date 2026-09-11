#!/bin/zsh

cd "$(dirname "$0")"

if ! curl --silent --fail http://127.0.0.1:4173/ >/dev/null; then
  npm run preview -- --host 127.0.0.1 >/tmp/mhd-hospital-preview.log 2>&1 &
fi

for attempt in {1..30}; do
  if curl --silent --fail http://127.0.0.1:4173/ >/dev/null; then
    break
  fi
  sleep 0.2
done

if [ -x "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" ]; then
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" "http://127.0.0.1:4173/" >/dev/null 2>&1 &
else
  open "http://127.0.0.1:4173/"
fi
