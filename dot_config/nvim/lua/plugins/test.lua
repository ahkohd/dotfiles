return {
	"klen/nvim-test",
	event = "VeryLazy",
	keys = {
		{
			"<space>tt",
			"<cmd>TestNearest<cr>",
			desc = "Run nearest test",
		},
		{
			"<space>tf",
			"<cmd>TestFile<cr>",
			desc = "Run all tests in file",
		},
		{
			"<space>ts",
			"<cmd>TestSuite<cr>",
			desc = "Run all tests in suite",
		},
		{
			"<space>tl",
			"<cmd>TestLast<cr>",
			desc = "Run last test",
		},
		{
			"<space>tv",
			"<dm>TestVisit<cr>",
			desc = "Open the last test in current buffer",
		},
		{
			"<space>ti",
			"<cmd>TestInfo<cr>",
			desc = "Show info about the test plugin",
		},
	},
	config = function()
		require("nvim-test").setup()
	end,
}
