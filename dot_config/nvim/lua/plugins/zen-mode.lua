return {
	"folke/zen-mode.nvim",
	event = "BufRead",
	keys = {
		{
			"<space>z",
			"<cmd>:ZenMode<CR>",
			desc = "Toggle Zen mode",
		},
	},
	opts = {
		options = {
			number = false,
			signcolumn = "no",
			cursorline = false,
			relativenumber = false,
		},
		plugins = {
			options = {
				enabled = true,
				laststatus = 0,
			},
			alacritty = {
				enabled = true,
				font = 14,
			},
			tmux = {
				enabled = true,
			},
		},
	},
}
