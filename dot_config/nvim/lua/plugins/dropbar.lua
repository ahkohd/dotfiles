return {
	"Bekaboo/dropbar.nvim",
	event = "BufRead",
	keys = {
		{ "<space>u", "<cmd>lua require('dropbar.api).pick()<cr>", desc = "Enter dropbar pick mode" },
	},
	dependencies = {
		"nvim-telescope/telescope-fzf-native.nvim",
	},
	opts = {},
}
