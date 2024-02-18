-- luacheck: globals vim

return {
	"preservim/vim-pencil",
	event = "VeryLazy",
	keys = {
		{
			"<space>lw",
			function()
				vim.cmd("PencilToggle")
			end,
			desc = "Toggle line wrap",
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
			desc = "Enable hard line breaks",
		},
		{
			"<space>lt",
			function()
				vim.cmd("TwilightEnable")
				vim.cmd("PencilSoft")
				vim.cmd("ZenMode")
			end,
			desc = "Toggle Writer mode",
		},
	},
	config = function() end,
}
