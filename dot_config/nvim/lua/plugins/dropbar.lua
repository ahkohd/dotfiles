return {
	"Bekaboo/dropbar.nvim",
	keys = {
		{ "n", "<leader>u", "<cmd>lua require('dropbar.api).pick()<cr>" },
	},
	dependencies = {
		"nvim-telescope/telescope-fzf-native.nvim",
	},
}
