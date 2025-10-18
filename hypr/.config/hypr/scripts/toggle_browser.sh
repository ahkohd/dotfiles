#!/bin/sh
if hyprctl clients | grep -i 'class: helium'; then
  hyprctl dispatch focuswindow 'class:^(helium)$'
else
  helium-browser
  sleep 1.0
  hyprctl dispatch focuswindow 'class:^(helium)$'
fi
