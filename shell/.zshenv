# Homebrew (must run before .zshrc which uses brew-installed tools)
if [[ -x /opt/homebrew/bin/brew ]]; then
  eval "$(/opt/homebrew/bin/brew shellenv)"
fi

. "$HOME/.cargo/env"
