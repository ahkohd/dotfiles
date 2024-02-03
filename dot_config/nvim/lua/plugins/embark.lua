-- luacheck: globals vim

return {
	"embark-theme/vim",
	name = "embark",
	lazy = false,
	priority = 1000,
	config = function()
		vim.cmd("colorscheme embark")
	end,
}
