return {
	"NeogitOrg/neogit",
	name = "neogit",
	dependencies = {
		"nvim-lua/plenary.nvim",
		"nvim-telescope/telescope.nvim",
		"sindrets/diffview.nvim",
	},
	keys = {
		{ "<space>g", "<cmd>lua require('neogit').open()<cr>", desc = "Neogit" },
	},
	config = true,
}
