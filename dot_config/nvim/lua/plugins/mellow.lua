-- luacheck: globals vim

return {
	"mellow-theme/mellow.nvim",
	name = "mellow",
	lazy = false,
	priority = 1000,
	config = function()
		vim.cmd("colorscheme mellow")
	end,
}
