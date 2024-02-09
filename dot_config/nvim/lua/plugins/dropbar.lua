return {
	"Bekaboo/dropbar.nvim",
	event = "BufRead",
	keys = {
		{
			"<space>u",
			function()
				require("dropbar.api").pick()
			end,
			desc = "Enter dropbar pick mode",
		},
	},
	dependencies = {
		"nvim-telescope/telescope-fzf-native.nvim",
	},
	opts = {},
}
