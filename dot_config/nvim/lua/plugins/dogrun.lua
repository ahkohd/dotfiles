-- luacheck: globals vim

return {
	"wadackel/vim-dogrun",
	name = "dogrun",
	lazy = false,
	priority = 1000,
	config = function()
		vim.cmd("colorscheme dogrun")
	end,
}
