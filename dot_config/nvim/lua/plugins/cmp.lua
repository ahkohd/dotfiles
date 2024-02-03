-- luacheck: globals vim

return {
	"hrsh7th/nvim-cmp",
	event = "InsertEnter",
	dependencies = {
		"hrsh7th/cmp-nvim-lsp",
		"hrsh7th/cmp-buffer",
		"onsails/lspkind-nvim",
	},
	config = function()
		if not vim.fn.exists("g:loaded_cmp") then
			return
		end

		vim.o.completeopt = "menuone,noinsert,noselect"

		local cmp = require("cmp")
		local lspkind = require("lspkind")

		local lspkind_comparator = function(conf)
			local lsp_types = require("cmp.types").lsp
			return function(entry1, entry2)
				-- Prioritize 'copilot' over everything else
				if entry1.source.name == "copilot" then
					return nil
				elseif entry2.source.name == "copilot" then
					return false
				end

				if entry1.source.name ~= "nvim_lsp" then
					if entry2.source.name == "nvim_lsp" then
						return false
					else
						return nil
					end
				end
				local kind1 = lsp_types.CompletionItemKind[entry1:get_kind()]
				local kind2 = lsp_types.CompletionItemKind[entry2:get_kind()]

				local priority1 = conf.kind_priority[kind1] or 0
				local priority2 = conf.kind_priority[kind2] or 0
				if priority1 == priority2 then
					return nil
				end
				return priority2 < priority1
			end
		end

		local label_comparator = function(entry1, entry2)
			return entry1.completion_item.label < entry2.completion_item.label
		end

		local has_words_before = function()
			if vim.api.nvim_buf_get_option(0, "buftype") == "prompt" then
				return false
			end
			local line, col = unpack(vim.api.nvim_win_get_cursor(0))
			return col ~= 0 and vim.api.nvim_buf_get_text(0, line - 1, 0, line - 1, col, {})[1]:match("^%s*$") == nil
		end

		cmp.setup({
			snippet = {
				expand = function(args)
					require("luasnip").lsp_expand(args.body)
				end,
			},
			sorting = {
				comparators = {
					lspkind_comparator({
						kind_priority = {
							Field = 11,
							Property = 11,
							Constant = 10,
							Enum = 10,
							EnumMember = 10,
							Event = 10,
							Function = 10,
							Method = 10,
							Operator = 10,
							Reference = 10,
							Struct = 10,
							Variable = 9,
							File = 8,
							Folder = 8,
							Class = 5,
							Color = 5,
							Module = 5,
							Keyword = 2,
							Constructor = 1,
							Interface = 1,
							Snippet = 0,
							Text = 1,
							TypeParameter = 1,
							Unit = 1,
							Value = 1,
						},
					}),
					label_comparator,
				},
			},
			mapping = cmp.mapping.preset.insert({
				["<C-d>"] = cmp.mapping.scroll_docs(-4),
				["<C-f>"] = cmp.mapping.scroll_docs(4),
				["<C-Space>"] = cmp.mapping.complete(),
				["<C-e>"] = cmp.mapping.close(),
				["<CR>"] = cmp.mapping.confirm({
					behavior = cmp.ConfirmBehavior.Replace,
					select = true,
				}),
				["<Tab>"] = vim.schedule_wrap(function(fallback)
					if cmp.visible() and has_words_before() then
						cmp.select_next_item({ behavior = cmp.SelectBehavior.Select })
					else
						fallback()
					end
				end),
			}),
			sources = cmp.config.sources({
				{ name = "copilot" },
				{ name = "nvim_lsp" },
			}, {
				{ name = "luasnip" },
				{ name = "path" },
			}, {
				{ name = "buffer" },
			}),
			formatting = {
				format = lspkind.cmp_format({ with_text = false, maxwidth = 50 }),
			},
			window = {
				documentation = {
					border = { "╭", "─", "╮", "│", "╯", "─", "╰", "│" },
					winhighlight = "FloatBorder:CmpPmenuBorder",
				},
				completion = {
					border = { "┌", "─", "┐", "│", "┘", "─", "└", "│" },
					winhighlight = "Normal:CmpPmenu,FloatBorder:CmpPmenuBorder,CursorLine:PmenuSel,Search:None",
				},
			},
		})

		vim.cmd([[highlight! default link CmpItemKind CmpItemMenuDefault]])
	end,
}
