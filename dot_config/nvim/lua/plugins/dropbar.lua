return {
	"Bekaboo/dropbar.nvim",
	keys = {
		{ "<leader>u", "<cmd>lua require('dropbar.api).pick()<cr>", desc = "Enter dropbar pick mode" },
	},
	dependencies = {
		"nvim-telescope/telescope-fzf-native.nvim",
	},
}
