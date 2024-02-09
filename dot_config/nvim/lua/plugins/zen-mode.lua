return {
	"folke/zen-mode.nvim",
	event = "BufRead",
	opts = {
		options = {
			number = false,
			signcolumn = "no",
			cursorline = true,
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
