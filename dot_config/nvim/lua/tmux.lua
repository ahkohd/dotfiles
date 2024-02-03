-- luacheck: globals vim

vim.g.tmux_navigator_no_mappings = 1
vim.api.nvim_set_keymap("n", "<C-h>", [[:<C-U>TmuxNavigateLeft<cr>]], { silent = true })
vim.api.nvim_set_keymap("n", "<C-j>", [[:<C-U>TmuxNavigateDown<cr>]], { silent = true })
vim.api.nvim_set_keymap("n", "<C-k>", [[:<C-U>TmuxNavigateUp<cr>]], { silent = true })
vim.api.nvim_set_keymap("n", "<C-l>", [[:<C-U>TmuxNavigateRight<cr>]], { silent = true })
vim.api.nvim_set_keymap("n", "<C-Space>", [[:<C-U>TmuxNavigatePrevious<cr>]], { silent = true })
