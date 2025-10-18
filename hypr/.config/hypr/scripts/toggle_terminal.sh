#!/bin/sh
if hyprctl clients | grep -i 'class: com.mitchellh.ghostty' | grep -v 'title: finder'; then
  hyprctl dispatch focuswindow 'class:^(com\.mitchellh\.ghostty)$'
else
  ghostty
  sleep 1.0
  hyprctl dispatch focuswindow 'class:^(com\.mitchellh\.ghostty)$'
fi
