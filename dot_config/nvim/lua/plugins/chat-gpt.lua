-- luacheck: globals vim

return {
	"jackMort/ChatGPT.nvim",
	lazy = true,
	dependencies = {
		"MunifTanjim/nui.nvim",
		"nvim-lua/plenary.nvim",
		"folke/trouble.nvim",
		"nvim-telescope/telescope.nvim",
	},
	config = function()
		local home = vim.fn.getenv("HOME")

		require("chatgpt").setup({
			api_key_cmd = "gpg --decrypt " .. home .. "/openai.gpg",
		})
	end,
}
