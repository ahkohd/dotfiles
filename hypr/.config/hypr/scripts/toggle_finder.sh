#!/bin/sh
if hyprctl clients | grep -q 'title: Finder'; then
  hyprctl dispatch focuswindow 'title:^Finder$'
else
  ghostty --title="Finder" --initial-command="yazi" &
  sleep 0.1
  hyprctl dispatch focuswindow 'title:^Finder$'
fi

