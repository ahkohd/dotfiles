return {
  "nvim-treesitter/nvim-treesitter-textobjects",
  lazy = true,
  config = function()
    require("nvim-treesitter.configs").setup({
      textobjects = {
        select = {
          enable = true,
          lookahead = true,
          keymaps = {
            ["oa"] = "@assignment.outer",
            ["ia"] = "@assignment.inner",
            ["la"] = "@assignment.lhs",
            ["ra"] = "@assignment.rhs",

            ["of"] = "@function.outer",
            ["if"] = "@function.inner",

            ["op"] = "@parameter.outer",
            ["ip"] = "@parameter.inner",

            ["oc"] = "@conditional.outer",
            ["ic"] = "@conditional.inner",

            ["ol"] = "@loop.outer",
            ["il"] = "@loop.inner",

            ["oi"] = "@call.outer",
            ["ii"] = "@call.inner",

            ["oo"] = "@class.outer",
            ["io"] = { query = "@class.inner", desc = "Select inner part of a class region" },
            ["as"] = { query = "@scope", query_group = "locals", desc = "Select language scope" },
          },
        },
        move = {
          enable = true,
          set_jumps = true, -- whether to set jumps in the jumplist
          goto_next_start = {
            ["]i"] = { query = "@call.outer", desc = "Next function call start" },
            ["]f"] = { query = "@function.outer", desc = "Next method/function def start" },
            ["]c"] = { query = "@conditional.outer", desc = "Next conditional start" },
            ["]l"] = { query = "@loop.outer", desc = "Next loop start" },

            -- You can pass a query group to use query from `queries/<lang>/<query_group>.scm file in your runtime path.
            -- Below example nvim-treesitter's `locals.scm` and `folds.scm`. They also provide highlights.scm and indent.scm.
            ["]s"] = { query = "@scope", query_group = "locals", desc = "Next scope" },
            ["]z"] = { query = "@fold", query_group = "folds", desc = "Next fold" },
          },
          goto_next_end = {
            ["]I"] = { query = "@call.outer", desc = "Next function call end" },
            ["]F"] = { query = "@function.outer", desc = "Next method/function def end" },
            ["]C"] = { query = "@conditional.outer", desc = "Next conditional end" },
            ["]L"] = { query = "@loop.outer", desc = "Next loop end" },
          },
          goto_previous_start = {
            ["[i"] = { query = "@call.outer", desc = "Prev function call start" },
            ["[f"] = { query = "@function.outer", desc = "Prev method/function def start" },
            ["[c"] = { query = "@conditional.outer", desc = "Prev conditional start" },
            ["[l"] = { query = "@loop.outer", desc = "Prev loop start" },
          },
          goto_previous_end = {
            ["[I"] = { query = "@call.outer", desc = "Prev function call end" },
            ["[F"] = { query = "@function.outer", desc = "Prev method/function def end" },
            ["[C"] = { query = "@conditional.outer", desc = "Prev conditional end" },
            ["[L"] = { query = "@loop.outer", desc = "Prev loop end" },
          },
        },
      },
    })

    local ts_repeat_move = require("nvim-treesitter.textobjects.repeatable_move")

    -- vim way: ; goes to the direction you were moving.
    vim.keymap.set({ "n", "x", "o" }, "<", ts_repeat_move.repeat_last_move)
    vim.keymap.set({ "n", "x", "o" }, ",", ts_repeat_move.repeat_last_move_opposite)
  end,
}
