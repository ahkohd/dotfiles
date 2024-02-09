-- luacheck: globals vim

return {
	"embark-theme/vim",
	name = "embark",
	lazy = false,
	priority = 1000,
	config = function()
		vim.cmd("colorscheme embark")

		-- Astral1: #cbe3e7
		-- Space1: #1e1c31

		vim.cmd("highlight NvimDarkGrey1 guifg=#cbe3e7 guibg=#1e1c31")
	end,
}
