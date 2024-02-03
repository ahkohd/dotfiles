-- luacheck: globals vim BTOP_TOGGLE GITUI_TOGGLE

return {
	"akinsho/toggleterm.nvim",
	event = "VeryLazy",
	version = "*",
	keys = {
		{ "<space><tab>", desc = "Open Terminal" },
		{
			"<space><PageUp>",
			function()
				BTOP_TOGGLE()
			end,
			desc = "Toggle btop",
		},
		{
			"<space><PageDown>",
			function()
				GITUI_TOGGLE()
			end,
			desc = "Toggle Git UI",
		},
	},
	config = function()
		local toggleterm = require("toggleterm")
		local Terminal = require("toggleterm.terminal").Terminal

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

		local btop = Terminal:new({ cmd = "btop", hidden = true })

		function BTOP_TOGGLE()
			btop:toggle()
		end

		local gitui = Terminal:new({ cmd = "gitui", hidden = true })

		function GITUI_TOGGLE()
			gitui:toggle()
		end

		-- use <esc> enter normal mode in terminal
		vim.api.nvim_set_keymap("t", "<ESC>", "<C-\\><C-n>", { noremap = true, silent = true })
	end,
}
