-- luacheck: globals vim

return {
	"preservim/vim-pencil",
	event = "VeryLazy",
	keys = {
		{
			"<space>l",
			function()
				vim.cmd("PencilToggle")
			end,
			desc = "Toggle line wrap with Pencil",
		},
		{
			"<space>ls",
			function()
				vim.cmd("PencilSoft")
			end,
			desc = "Enable soft line wrap",
		},
		{
			"<space>lh",
			function()
				vim.cmd("PencilHard")
			end,
			desc = "Enable hard line wrap",
		},
	},
	config = function() end,
}
