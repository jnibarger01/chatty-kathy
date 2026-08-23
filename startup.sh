#!/bin/sh
set -eu
cd /workspace
mkdir -p /workspace/data /tmp

# API stays on loopback so the live preview cannot pick it up as the app
# (GET / on FastAPI used to return {"detail":"Not Found"}).
if ! curl -sf -o /dev/null --max-time 2 http://127.0.0.1:8000/health; then
  CHAT_DATA_DIR=/workspace/data \
    /workspace/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 \
    >>/tmp/fastapi-startup.log 2>&1 &
  i=0
  while [ "$i" -lt 40 ]; do
    if curl -sf -o /dev/null --max-time 1 http://127.0.0.1:8000/health; then
      break
    fi
    i=$((i + 1))
    sleep 0.25
  done
fi

if curl -sf -o /dev/null --max-time 2 http://127.0.0.1:8080/; then
  exit 0
fi
npm run dev >>/tmp/app-startup.log 2>&1 &
