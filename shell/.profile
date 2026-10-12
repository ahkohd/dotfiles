[ -f "$HOME/.env" ] && . "$HOME/.env"

if [[ "$(uname)" == "Linux" ]]; then
    if [ -f ~/.profile.linux ]; then
        source ~/.profile.linux
    fi
fi
