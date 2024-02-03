return {
	"nvim-treesitter/nvim-treesitter",
	build = ":TSUpdate",
	event = { "BufReadPre", "BufNewFile" },
	dependencies = { "nvim-treesitter/nvim-treesitter-textobjects", "nvim-treesitter/nvim-treesitter-context" },
	config = function()
		if not vim.g.loaded_nvim_treesitter then
			vim.cmd([[echom "Not loaded treesitter"]])
			return
		end

		require("nvim-treesitter.configs").setup({
			highlight = {
				enable = true,
				additional_vim_regex_highlighting = { "markdown" },
			},
			indent = {
				enable = true,
			},
			ensure_installed = {
				"tsx",
				"typescript",
				"javascript",
				"toml",
				"json",
				"yaml",
				"html",
				"css",
				"scss",
				"rust",
				"lua",
				"gitignore",
				"markdown",
				"markdown_inline",
			},
			autotag = {
				enable = true,
			},
			incremental_selection = {
				enable = true,
				keymaps = {
					init_selection = "<C-space>",
					node_incremental = "<C-space>",
					scope_incremental = false,
					node_decremental = "<bs>",
				},
			},
			-- playground = {
			--   enable = true,
			--   disable = {},
			--   updatetime = 25,     -- Debounced time for highlighting nodes in the playground from source code
			--   persist_queries = false, -- Whether the query persists across vim sessions
			--   keybindings = {
			--     toggle_query_editor = "o",
			--     toggle_hl_groups = "i",
			--     toggle_injected_languages = "t",
			--     toggle_anonymous_nodes = "a",
			--     toggle_language_display = "I",
			--     focus_language = "f",
			--     unfocus_language = "F",
			--     update = "R",
			--     goto_node = "<cr>",
			--     show_help = "?",
			--   },
			-- },
			query_linter = {
				enable = true,
				use_virtual_text = true,
				lint_events = { "BufWrite", "CursorHold" },
			},
		})
		local parser_config = require("nvim-treesitter.parsers").get_parser_configs()
		parser_config.tsx.filetype_to_parsername = { "javascript", "typescript.tsx" }
	end,
}
