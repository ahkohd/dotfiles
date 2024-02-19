-- luacheck: globals vim

return {
	"aktersnurra/no-clown-fiesta.nvim",
	lazy = false,
	priority = 1000,
	config = function()
		require("no-clown-fiesta").setup({
			transparent = not vim.g.neovide,
			styles = {
				comments = {},
				keywords = {},
				functions = {},
				variables = {},
				type = { bold = false },
				lsp = { underline = true },
			},
		})

		vim.cmd("colorscheme no-clown-fiesta")

		vim.cmd("highlight LspInlayHint guifg=#373737")
	end,
}
