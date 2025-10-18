#!/bin/sh
if hyprctl clients | grep -i 'class: legcord'; then
  hyprctl dispatch focuswindow 'class:^(legcord)$'
else
  legcord --enable-features=UseOzonePlatform --ozone-platform=wayland
  sleep 0.1
  hyprctl dispatch focuswindow 'class:^(legcord)$'
fi

