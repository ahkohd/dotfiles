return {
  "zbirenbaum/copilot.lua",
  name = "copilot",
  event = "VeryLazy",
  dependencies =  { "zbirenbaum/copilot-cmp" },
  config = function ()
    require("copilot").setup({
      suggestion = { enabled = true },
      panel = { enabled = true },
    })
    require("copilot_cmp").setup()
  end
}
