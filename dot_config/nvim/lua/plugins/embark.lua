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

		vim.api.nvim_set_hl(0, "NvimDarkGrey1", { ctermbg = 0, bg = "#1e1c31" })
	end,
}
