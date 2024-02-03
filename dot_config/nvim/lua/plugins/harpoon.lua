-- luacheck: globals vim

return {
	"ThePrimeagen/harpoon",
	dependencies = {
		"nvim-lua/plenary.nvim",
	},
	event = "VeryLazy",
	keys = {
		{
			"<space>h",
			"<cmd>lua require('harpoon.ui').toggle_quick_menu()<cr>",
			desc = "Harpoon",
		},
		{
			"<space>hh",
			"<cmd>lua require('harpoon.ui').toggle_quick_menu()<cr>",
			desc = "Menu",
		},
		{
			"<space>ha",
			"<cmd>lua require('harpoon.mark').add_file()<cr>",
			desc = "Add mark",
		},
		{
			"<space>hj",
			"<cmd>lua require('harpoon.ui').nav_prev()<cr>",
			desc = "Prev mark",
		},
		{
			"<space>hk",
			"<cmd>lua require('harpoon.ui').nav_next()<cr>",
			desc = "Next mark",
		},
		{
			"<space>h1",
			"<cmd>lua require('harpoon.ui').nav_file(1)<cr>",
			desc = "Goto #1",
		},
		{
			"<space>h2",
			"<cmd>lua require('harpoon.ui').nav_file(2)<cr>",
			desc = "Goto #2",
		},
		{
			"<space>h3",
			"<cmd>lua require('harpoon.ui').nav_file(3)<cr>",
			desc = "Goto #3",
		},
		{
			"<space>h4",
			"<cmd>lua require('harpoon.ui').nav_file(4)<cr>",
			desc = "Goto #4",
		},
		{
			"<space>h5",
			"<cmd>lua require('harpoon.ui').nav_file(5)<cr>",
			desc = "Goto #5",
		},
		{
			"<space><left>",
			"<cmd>bp<cr>",
			desc = "Go-to previous buffer",
		},
		{
			"<space><right>",
			"<cmd>bn<cr>",
			desc = "Go-to next buffer",
		},
	},
}
