#!/bin/bash
# Called by the agent when it's done. Exits the tmux session after a delay.
echo "Task complete. Exiting in 5s (Ctrl+C to cancel)..."
sleep 5
tmux send-keys -t "$(tmux display-message -p '#{session_name}')" '/exit' Enter
