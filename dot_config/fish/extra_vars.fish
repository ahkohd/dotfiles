# use bat for colorizing pager for man
set -x MANPAGER "sh -c 'col -bx | bat -l man -p'"

# set default editor

set -x EDITOR "nvim"
