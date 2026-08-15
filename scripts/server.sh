#!/bin/bash
cd /home/z/my-project
while true; do
  node /home/z/my-project/node_modules/next/dist/bin/next dev -p 3000
  echo "[$(date)] Server crashed. Restarting in 3s..." >> /tmp/next-crash.log
  sleep 3
done
