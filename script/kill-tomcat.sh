#!/usr/bin/env bash
#
# kill-tomcat.sh
# Force-kills any running catalina processes on this machine.
# Useful when a debug Extension Host crashed and left a Tomcat
# child process running, mirroring processManager.ts's killAll().

set -euo pipefail

echo "Looking for running catalina processes..."
PIDS="$(pgrep -f "catalina" || true)"

if [ -z "$PIDS" ]; then
  echo "No catalina processes found."
  exit 0
fi

echo "Found process(es): $PIDS"
for pid in $PIDS; do
  echo "Killing PID $pid..."
  kill -9 "$pid" || true
done

echo "Done."