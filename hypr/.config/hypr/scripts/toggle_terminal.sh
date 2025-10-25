#!/bin/sh
# if hyprctl clients | grep -i 'class: com.mitchellh.ghostty' | grep -v 'title: finder'; then
#   hyprctl dispatch focuswindow 'class:^(com\.mitchellh\.ghostty)$'
# else
#   ghostty
#   sleep 1.0
#   hyprctl dispatch focuswindow 'class:^(com\.mitchellh\.ghostty)$'
# fi

if hyprctl clients | grep -i 'class: Alacritty'; then
  hyprctl dispatch focuswindow 'class:^(Alacritty)$'
else
  alacritty
  sleep 0.5
  hyprctl dispatch focuswindow 'class:^(Alacritty)$'
fi
