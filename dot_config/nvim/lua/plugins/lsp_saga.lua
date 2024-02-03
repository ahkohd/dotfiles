-- luacheck: globals vim

return {
	"nvimdev/lspsaga.nvim",
	event = "BufRead",
	keys = {
		{ "<space>dl", "<cmd>Lspsaga show_line_diagnostics<CR>", desc = "Show line diagnostics" },
		{ "<space>db", "<cmd>Lspsaga show_buf_diagnostics<CR>", desc = "Show buffer diagnostics" },
		{ "<space>dw", "<cmd>Lspsaga show_workspace_diagnostics<CR>", desc = "Show workspace diagnostics" },
		{ "<space>dk", "<cmd>Lspsaga diagnostic_jump_prev<CR>", desc = "Jump to Previous diagnostic" },
		{ "<space>dj", "<cmd>Lspsaga diagnostic_jump_next<CR>", desc = "Jump to Next diagnostic" },

		{ "K", "<cmd>Lspsaga hover_doc<CR>", desc = "Show hover doc" },
		{ "<space>a", "<cmd>Lspsaga code_action<CR>", desc = "Show code action" },

		{ "gr", "<cmd>Lspsaga rename<CR>", desc = "Rename all references" },
		{ "gh", "<cmd>Lspsaga finder<CR>", desc = "Show references & definitions" },

		{ "gd", "<cmd>Lspsaga peek_definition<CR>", desc = "Peek definition" },
		{ "<leader>gd", "<cmd>Lspsaga goto_definition<CR>", desc = "Go-to definition" },
		{ "gt", "<cmd>Lspsaga peek_type_definition<CR>", desc = "Peek type definition" },
		{ "<leader>gt", "<cmd>Lspsaga goto_type_definition<CR>", desc = "Go-to type definition" },
	},
	config = function()
		local saga = require("lspsaga")
		saga.setup({
			ui = {
				code_action = "",
			},
			symbol_in_winbar = {
				separator = " → ",
			},
			lightbulb = {
				enable = false,
			},
		})

		local function lspSymbol(name, icon)
			local hl = "DiagnosticSign" .. name
			vim.fn.sign_define(hl, { text = icon, numhl = hl, texthl = hl })
		end

		lspSymbol("Error", "")
		lspSymbol("Hint", "")
		lspSymbol("Info", "")
		lspSymbol("Warn", "")
	end,
}
