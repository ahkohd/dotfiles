#!/bin/sh
if hyprctl clients | grep -i 'class: neovide'; then
  hyprctl dispatch focuswindow 'class:^(neovide)$'
else
  neovide
  sleep 1.0
  hyprctl dispatch focuswindow 'class:^(neovide)$'
fi
