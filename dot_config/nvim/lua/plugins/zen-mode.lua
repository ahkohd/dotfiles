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
		window = {
			backdrop = 1,
			options = {
				signcolumn = "no",
				number = false,
				relativenumber = false,
				cursorline = false,
				cursorcolumn = false,
				foldcolumn = "0",
			},
		},
		plugins = {
			options = {
				enabled = true,
				laststatus = 0,
			},
			alacritty = {
				enabled = false,
				font = 14,
			},
			tmux = {
				enabled = true,
			},
		},
	},
}
