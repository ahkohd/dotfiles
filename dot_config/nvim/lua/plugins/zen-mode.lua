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
			options = {
				signcolumn = "no",
				number = false,
				relativenumber = false,
				cursorline = false,
				cursorcolumn = false,
				foldcolumn = "0",
				list = false,
			},
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
