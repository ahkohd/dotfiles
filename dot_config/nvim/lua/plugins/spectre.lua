-- luacheck: globals vim

return {
	"nvim-pack/nvim-spectre",
	keys = {
		{ "<space>ss", "<cmd>lua require('spectre').toggle()<CR>", desc = "Find & Replace" },
		{
			"<space>sw",
			"<cmd>lua require('spectre').open_visual({select_word=true})<CR>",
			desc = "Find & replace current word selection",
		},
		{
			"<space>sp",
			"<cmd>lua require('spectre').open_file_search({select_word=true})<CR>",
			desc = "Find & replace current yank",
		},
	},
	config = function()
		local spectre = require("spectre")
		spectre.setup()

		vim.keymap.set("n", "<leader>sw", "", {
			desc = "Search current word",
		})
		vim.keymap.set("v", "<leader>sw", '<esc><cmd>lua require("spectre").open_visual()<CR>', {
			desc = "Search current word",
		})
		vim.keymap.set("n", "<leader>sp", '<cmd>lua require("spectre").open_file_search({select_word=true})<CR>', {
			desc = "Search on current file",
		})
	end,
}
