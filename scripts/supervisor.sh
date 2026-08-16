#!/bin/bash
# Persistent supervisor for Next.js on Z.ai
# Writes PID file, restarts server on crash, handles signals

PIDFILE=/tmp/next-supervisor.pid
LOG=/tmp/next-supervisor.log
PROJECT=/home/z/my-project
PORT=3000

echo "[$(date -u +%FT%TZ)] Supervisor starting (PID=$$)" >> "$LOG"
echo "$$" > "$PIDFILE"

# Cleanup on exit
trap 'echo "[$(date -u +%FT%TZ)] Supervisor shutting down" >> "$LOG"; rm -f "$PIDFILE"; exit 0' SIGTERM SIGINT

crash_count=0
last_start=0

while true; do
    echo "[$(date -u +%FT%TZ)] Starting Next.js on :$PORT" >> "$LOG"
    last_start=$(date +%s)
    
    # Run Next.js in foreground
    cd "$PROJECT" && npx next dev -p "$PORT" 2>&1 | while IFS= read -r line; do
        echo "[$(date -u +%FT%TZ)] $line" >> "$LOG"
    done
    
    exit_code=${PIPESTATUS[0]}
    now=$(date +%s)
    uptime=$((now - last_start))
    
    echo "[$(date -u +%FT%TZ)] Server exited (code=$exit_code, uptime=${uptime}s)" >> "$LOG"
    
    # If stable for >30s, reset crash counter
    if [ "$uptime" -gt 30 ]; then
        crash_count=0
    else
        crash_count=$((crash_count + 1))
    fi
    
    # Backoff: more crashes = longer wait
    if [ "$crash_count" -gt 5 ]; then
        wait_time=30
    elif [ "$crash_count" -gt 3 ]; then
        wait_time=10
    else
        wait_time=3
    fi
    
    echo "[$(date -u +%FT%TZ)] Restart in ${wait_time}s (crashes=$crash_count)" >> "$LOG"
    sleep "$wait_time"
done
