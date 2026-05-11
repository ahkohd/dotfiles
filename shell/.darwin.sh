[[ -s "/Users/$USER/.gvm/scripts/gvm" ]] && source "/Users/$USER/.gvm/scripts/gvm"

export GPG_TTY=$(tty)
gpg-connect-agent updatestartuptty /bye >/dev/null 2>&1
