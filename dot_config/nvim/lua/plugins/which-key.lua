-- luacheck: globals vim

return {
	"folke/which-key.nvim",
	event = "VeryLazy",
	init = function()
		vim.o.timeout = true
		vim.o.timeoutlen = 300
	end,
	config = function()
		local wk = require("which-key")
		wk.setup()
		wk.register({
			["<space>"] = {
				w = { "<cmd>w<cr>", "Save" },
				q = { "<cmd>qa!<cr>", "Quit" },
			},
			["<space>s"] = {
				name = "Find and Replace",
			},
			["<space>h"] = {
				name = "Harpoon",
			},
			["<space>d"] = {
				name = "Diagnostics",
			},
			["<space>g"] = {
				name = "Git mode",
			},
			["<space>b"] = {
				name = "Debug",
			},
			["<space>t"] = {
				name = "Tests",
			},
			["<space>x"] = {
				name = "Sessions",
			},
		})
	end,
}
