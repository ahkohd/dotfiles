# Setup fzf
# ---------
if [[ ! "$PATH" == */Users/$USER/.fzf/bin* ]]; then
  PATH="${PATH:+${PATH}:}/Users/$USER/.fzf/bin"
fi

source <(fzf --zsh)
