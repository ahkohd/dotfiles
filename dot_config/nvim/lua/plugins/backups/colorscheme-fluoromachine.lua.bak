-- luacheck: globals vim

return {
	{
		"maxmx03/fluoromachine.nvim",
		config = function()
			local fm = require("fluoromachine")

			fm.setup({
				glow = false,
				theme = "delta",
				transparent = "full",
			})

			vim.cmd.colorscheme("fluoromachine")

			vim.cmd("highlight TelescopeTitle gui=NONE")
			vim.cmd("highlight TelescopePromptTitle gui=NONE")
			vim.cmd("highlight TelescopePreviewTitle gui=NONE")
		end,
	},
}
