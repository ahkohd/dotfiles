# autoload completions
autoload -Uz compinit; compinit -u

. "$HOME/.cargo/env"

eval "$(starship init zsh)"

source <(jj util completion zsh)

# Set up fzf key bindings and fuzzy completion
[ -f ~/.fzf.zsh ] && source ~/.fzf.zsh
source <(fzf --zsh)
source ~/.fzf-tab/fzf-tab.plugin.zsh

eval "$(zoxide init zsh)"

eval "$(direnv hook zsh)"

function yy() {
  local tmp="$(mktemp -t "yazi-cwd.XXXXX")"
  yazi "$@" --cwd-file="$tmp"
  if cwd="$(cat -- "$tmp")" && [ -n "$cwd" ] && [ "$cwd" != "$PWD" ]; then
    builtin cd -- "$cwd"
  fi
  rm -f -- "$tmp"
}

if [[ "$(uname)" == "Linux" ]]; then
    if [ -f ~/.linux.sh ]; then
        source ~/.linux.sh
    fi
fi

if [[ "$OSTYPE" == "darwin"* ]]; then
    if [ -f ~/.darwin.sh ]; then
        source ~/.darwin.sh
    fi
fi

if [ -f ~/.env ]; then
    . ~/.env
fi

if [[ "$(uname)" == "Linux" ]]; then
    if [ -f ~/.linux.env ]; then
        source ~/.linux.env
    fi
fi

if [[ "$OSTYPE" == "darwin"* ]]; then
    if [ -f ~/.darwin.env ]; then
        source ~/.darwin.env
    fi
fi

if [ -f ~/.aliases ]; then
    . ~/.aliases
fi

if [[ "$(uname)" == "Linux" ]]; then
    if [ -f ~/.linux.aliases ]; then
        source ~/.linux.aliases
    fi
fi

if [ -f ~/.darwin.aliases ]; then
    source ~/.darwin.aliases
fi
