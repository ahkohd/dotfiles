-- luacheck: globals vim

return {
	"kdheepak/lazygit.nvim",
	event = "VeryLazy",
	keys = {
		{
			"<space>g",
			function()
				vim.cmd("LazyGit")
			end,
			desc = "Toggle LazyGit",
		},
	},
	dependencies = {
		"nvim-lua/plenary.nvim",
	},
}
