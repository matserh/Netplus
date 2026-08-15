#!/bin/bash
# Netplus Server Keeper — auto-restart on crash
# Usage: bash /home/z/my-project/scripts/server-keeper.sh

cd /home/z/my-project
LOG="/tmp/next-keeper.log"
echo "[$(date)] Server keeper started" >> "$LOG"

while true; do
  echo "[$(date)] Starting Next.js server..." >> "$LOG"
  node /home/z/my-project/node_modules/next/dist/bin/next dev -p 3000 2>&1 | while IFS= read -r line; do
    echo "$line"
    echo "[$(date)] $line" >> "$LOG"
  done
  EXIT=$?
  echo "[$(date)] Server exited with code $EXIT. Restarting in 3s..." >> "$LOG"
  sleep 3
done
