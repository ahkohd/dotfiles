-- luacheck: globals vim

return {
	"embark-theme/vim",
	name = "embark",
	lazy = false,
	priority = 1000,
	config = function()
		vim.cmd("colorscheme embark")
		vim.cmd([[autocmd ColorScheme * highlight link NormalFloat Normal]])
	end,
}
