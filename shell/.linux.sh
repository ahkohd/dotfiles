fpath=(~/.local/share/zsh/site-functions $fpath)

[[ -s "$HOME/.gvm/scripts/gvm" ]] && source "$HOME/.gvm/scripts/gvm"
export PATH=$PATH:$GOBIN/bin
