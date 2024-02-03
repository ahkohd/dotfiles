return {
	"stevearc/oil.nvim",
	dependencies = { "nvim-tree/nvim-web-devicons" },
	name = "oil",
	lazy = false,
	keys = {
		{ "<space>o", "<cmd>lua require('oil').open()<cr>", desc = "Open Oil" },
	},
	opts = {},
}
