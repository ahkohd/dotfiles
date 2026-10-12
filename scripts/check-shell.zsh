# Run from the repo: /bin/zsh -lic 'source scripts/check-shell.zsh'
() {
  local name tool
  [[ $PROMPT == '%~ %# ' && $PAGER == moor ]] || return 1
  [[ ${aliases[zz]} == 'cd -' ]] || return 1
  for name in ls cat cd grep z; do
    (( ! ${+aliases[$name]} )) || return 1
  done
  for name in z zi fzf-file-widget _atuin_search _bun; do
    (( ${+functions[$name]} )) || return 1
  done
  (( ! $+functions[za] && ! $+functions[zk] )) || return 1
  local -a unique_path=("${(@u)path}")
  (( $#path == $#unique_path )) || return 1
  for tool in pi node npm bun cargo nvim jj fzf atuin moor; do
    command -v "$tool" >/dev/null || return 1
  done
  print 'PASS: shell startup, native commands, integrations, unique PATH and tools'
}
