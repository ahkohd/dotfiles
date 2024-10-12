if status is-interactive
    # Commands to run in interactive sessions can go here
end

# apply shell theme
source ~/.config/fish/themes/tokyonight_storm.fish

# apply fzf theme
source ~/.config/fish/themes/fzf.fish

# alias
source ~/.config/fish/alias.fish

# setup direnv
direnv hook fish | source

# setup zoxide
zoxide init fish | source

# setup starship prompt
starship init fish | source
