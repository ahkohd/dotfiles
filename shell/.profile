. "$HOME/.cargo/env"

if [[ "$(uname)" == "Linux" ]]; then
    if [ -f ~/.profile.linux ]; then
        source ~/.profile.linux
    fi
fi

export PATH="$HOME/.local/bin:$PATH"
