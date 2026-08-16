#!/bin/bash
# =============================================================
# Next.js Watchdog for Z.ai containers
# Checks every 20s if the server is running, restarts if not
# Started via double-fork to survive shell exits
# =============================================================
PROJECT_DIR="/home/z/my-project"
LOG_FILE="/tmp/next-watchdog.log"
PID_FILE="/tmp/next-server.pid"
CHECK_INTERVAL=20

echo "[$(date -u +%FT%TZ)] Watchdog starting (PID=$$)" >> "$LOG_FILE"

while true; do
    # Check if Next.js is responding
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null | grep -qE "^(200|301|302)$"; then
        # Server is healthy, just wait
        sleep "$CHECK_INTERVAL"
        continue
    fi
    
    # Server not responding - check if any next process exists
    if ! pgrep -f "next dev" > /dev/null 2>&1; then
        echo "[$(date -u +%FT%TZ)] Server not running and not responding, starting..." >> "$LOG_FILE"
        
        # Start Next.js via double-fork + setsid for proper detachment
        ( cd "$PROJECT_DIR" && setsid npx next dev -p 3000 &>>/tmp/next-auto-start.log & )
        
        # Wait for it to come up
        for i in $(seq 1 15); do
            sleep 1
            if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null | grep -qE "^(200|301|302)$"; then
                echo "[$(date -u +%FT%TZ)] Server started successfully after ${i}s" >> "$LOG_FILE"
                break
            fi
        done
    else
        # Process exists but not responding - might be starting up
        echo "[$(date -u +%FT%TZ)] Next process exists but not responding, waiting..." >> "$LOG_FILE"
        sleep 5
    fi
    
    sleep "$CHECK_INTERVAL"
done
