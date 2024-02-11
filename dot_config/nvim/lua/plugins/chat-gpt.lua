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
		require("chatgpt").setup({
			api_key_cmd = "op read op://Personal/OpenAiApi/credential --no-newline",
		})
	end,
}
