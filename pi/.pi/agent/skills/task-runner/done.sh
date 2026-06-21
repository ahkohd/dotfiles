#!/bin/bash
# Called by the agent when it's done. Exits the zmx session after a delay.
echo "Task complete. Exiting in 5s (Ctrl+C to cancel)..."
sleep 5
if [ -z "$ZMX_SESSION" ]; then
  echo "ZMX_SESSION not set" >&2
  exit 1
fi
printf '/exit\r' | zmx send "$ZMX_SESSION"
