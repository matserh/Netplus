#!/bin/bash
cd /home/z/my-project
while true; do
  npx next dev -p 3000 2>&1
  echo "[$(date)] Server exited. Restarting in 2s..." >> /tmp/next-restarts.log
  sleep 2
done
