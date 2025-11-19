# autoload completions
autoload -Uz compinit; compinit -u

. "$HOME/.cargo/env"

setopt PROMPT_SUBST
PS1='$(prmt --no-version --code $? "{path:cyan.bold}{git:purple:f: on }{rust:red.bold:s: 🦀}{node:green.bold:s: ⬢ }\n{ok:green}{fail:red}") '

# Set up fzf key bindings and fuzzy completion
[ -f ~/.fzf.zsh ] && source ~/.fzf.zsh
source <(fzf --zsh)
source ~/.fzf-tab/fzf-tab.plugin.zsh

eval "$(zoxide init zsh)"

eval "$(direnv hook zsh)"

eval "$(atuin init zsh --disable-up-arrow)"

function yy() {
  local tmp="$(mktemp -t "yazi-cwd.XXXXX")"
  yazi "$@" --cwd-file="$tmp"
  if cwd="$(cat -- "$tmp")" && [ -n "$cwd" ] && [ "$cwd" != "$PWD" ]; then
    builtin cd -- "$cwd"
  fi
  rm -f -- "$tmp"
}

if [[ "$OSTYPE" == "linux"* ]]; then
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

if [[ "$OSTYPE" == "linux"* ]]; then
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

if [[ "$OSTYPE" == "linux"* ]]; then
    if [ -f ~/.linux.aliases ]; then
        source ~/.linux.aliases
    fi
fi

if [[ "$OSTYPE" == "darwin"* ]]; then
    if [ -f ~/.darwin.aliases ]; then
        source ~/.darwin.aliases
    fi
fi

if [ -f ~/.functions ]; then
    . ~/.functions
fi

if [[ "$OSTYPE" == "linux"* ]]; then
    if [ -f ~/.linux.functions ]; then
        source ~/.linux.functions
    fi
fi

if [[ "$OSTYPE" == "darwin"* ]]; then
    if [ -f ~/.darwin.functions ]; then
        source ~/.darwin.functions
    fi
fi

# Added by Antigravity
export PATH="/Users/bird/.antigravity/antigravity/bin:$PATH"
