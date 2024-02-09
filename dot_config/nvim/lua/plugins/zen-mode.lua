return {
	"folke/zen-mode.nvim",
	event = "BufRead",
	opts = {
		plugins = {
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
