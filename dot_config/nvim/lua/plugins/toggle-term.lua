-- luacheck: globals vim

return {
	"akinsho/toggleterm.nvim",
	event = "VeryLazy",
	version = "*",
	keys = {
		{ "<space><tab>", desc = "Open Terminal" },
	},
	config = function()
		local toggleterm = require("toggleterm")

		toggleterm.setup({
			open_mapping = [[<space><tab>]],
			direction = "float",
			size = 80,
			start_in_insert = false,
			insert_mappings = false,
			float_opts = {
				border = "curved",
			},
		})
	end,
}
