if status is-interactive
    # Commands to run in interactive sessions can go here
end

eval (/opt/homebrew/bin/brew shellenv)

# apply shell theme
source ~/.config/fish/themes/tokyonight_storm.fish

# apply fzf theme
source ~/.config/fish/themes/fzf.fish

# alias
source ~/.config/fish/alias.fish

# extra variables
source ~/.config/fish/extra_vars.fish

# setup zoxide
zoxide init fish | source

# setup direnv
direnv hook fish | source

# setup starship prompt
starship init fish | source
