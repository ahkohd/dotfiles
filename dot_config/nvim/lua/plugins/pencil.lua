-- luacheck: globals vim

return {
	"preservim/vim-pencil",
	event = "VeryLazy",
	keys = {
		{
			"<space>l",
			description = "Pencil",
			function()
				vim.cmd("PencilToggle")
			end,
		},
		{
			"<space>ls",
			description = "PencilSoft",
			function()
				vim.cmd("PencilSoft")
			end,
		},
		{
			"<space>lh",
			description = "PencilHard",
			function()
				vim.cmd("PencilHard")
			end,
		},
	},
	config = function() end,
}
