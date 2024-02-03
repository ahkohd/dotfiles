return {
	"axkirillov/hbac.nvim",
	dependencies = {
		"nvim-telescope/telescope.nvim",
		"nvim-lua/plenary.nvim",
		"nvim-tree/nvim-web-devicons",
	},
	event = "BufRead",
	config = function()
		require("hbac").setup({
			autoclose = true,
			threshold = 15,
		})
	end,
}
