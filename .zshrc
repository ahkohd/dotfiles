export PATH="$HOME/source/neovim/bin:$PATH"

fpath=(~/.local/share/zsh/site-functions $fpath)

. "$HOME/.cargo/env"

eval "$(starship init zsh)"

# autoload completions
autoload -U compinit; compinit
source <(jj util completion zsh)

[ -f ~/.fzf.zsh ] && source ~/.fzf.zsh
source <(fzf --zsh)
source ~/.fzf-tab/fzf-tab.plugin.zsh

eval "$(zoxide init zsh)"

[[ -s "$HOME/.gvm/scripts/gvm" ]] && source "$HOME/.gvm/scripts/gvm"
export PATH=$PATH:$GOBIN/bin

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion

# environment variables
export EDITOR=nvim
export PAGER=moar
export BACON_PREFS=~/.config/bacon/prefs.toml

# autoload functions
autoload -Uz y jbk jgp

# aliases
alias c=clear
alias gpg-check="gpg --decrypt ~/test.gpg"
alias dev="~/developer/personal"
alias grep="grep --color=auto"
alias gst="git status"
alias glg="git log -n 10 --graph --decorate --oneline"
alias cat="bat"
alias nv="nvim"
alias nvc="nvim-config"
alias x="exit"
alias lg="lazygit"
alias cd="z"
alias ls="eza --tree --level=1"
alias l="eza -l --tree --level=1"
alias zz="z -"
alias p="pnpm"
alias speed="speedtest-cli"
alias jn="jj new"
alias jst="jj st --no-pager"
alias jpw="jj git push --change=@"
alias jsq="jj squash"
alias jsqi="jj squash --ignore-immutable"
alias jed="jj edit"
alias jedi="jj edit --ignore-immutable"
alias jds="jj desc"
alias jdsi="jj desc --ignore-immutable"
alias jfo="jj git fetch --remote=origin"
alias jbki="jbk --ignore-immutable"
alias jab="jj abandon"
alias jls="jj log -n 12"
alias jll="jj log -n 12 -r '..@'"
alias jla="jj log -r 'all()'"
alias jllb="jj log -r 'bookmarks()'"
alias jlrb="jj log -r 'remote_bookmarks()'"
alias jlh="jj log -r 'visible_heads()'"
alias j="jj"
