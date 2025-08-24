gh_env() {
  export GITHUB_PERSONAL_ACCESS_TOKEN=$(op read "op://Personal/SHELL GH_PATH/credential" --no-newline) Add commentMore actions
  export GH_PAT=$(op read "op://Personal/SHELL GH_PATH/credential" --no-newline)
 }

ai_env() {
  export OPENAI_API_KEY=$(op read "op://Personal/OpenAiApi/credential" --no-newline)
}

[[ -s "/Users/$USER/.gvm/scripts/gvm" ]] && source "/Users/$USER/.gvm/scripts/gvm"
