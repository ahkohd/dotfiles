# Keep the first occurrence of each PATH entry.
typeset -U path
[ -f "$HOME/.env" ] && . "$HOME/.env"
