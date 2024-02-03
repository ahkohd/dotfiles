-- luacheck: globals vim

return {
	"kevinhwang91/nvim-ufo",
	dependencies = { "kevinhwang91/promise-async" },
	event = { "BufReadPre", "BufNewFile" },
	keys = {
		{ "zR", "<cmd>:lua require('ufo').openAllFolds()<CR>", desc = "Open all folds" },
		{ "zM", "<cmd>:lua require('ufo').closeAllFolds()<CR>", desc = "Close all folds" },
		{ "zr", "<cmd>:lua require('ufo').openFoldsExceptKinds()<CR>", desc = "Open all folds except kinds" },
		{ "zm", "<cmd>:lua require('ufo').closeFoldsWith()<CR>", desc = "Close all folds with kinds" },
		{ "K", desc = "Peek folded lines under cursor" },
	},
	config = function()
		local ftMap = {
			vim = "indent",
			python = { "indent" },
			git = "",
		}

		vim.o.foldcolumn = "0"
		vim.o.foldlevel = 99
		vim.o.foldlevelstart = 99
		vim.o.foldenable = true
		vim.o.fillchars = [[eob: ,fold: ,foldopen:,foldsep: ,foldclose:]]

		local handler = function(virtText, lnum, endLnum, width, truncate)
			local newVirtText = {}
			local suffix = (" ↙%d "):format(endLnum - lnum)
			local sufWidth = vim.fn.strdisplaywidth(suffix)
			local targetWidth = width - sufWidth
			local curWidth = 0
			for _, chunk in ipairs(virtText) do
				local chunkText = chunk[1]
				local chunkWidth = vim.fn.strdisplaywidth(chunkText)
				if targetWidth > curWidth + chunkWidth then
					table.insert(newVirtText, chunk)
				else
					chunkText = truncate(chunkText, targetWidth - curWidth)
					local hlGroup = chunk[2]
					table.insert(newVirtText, { chunkText, hlGroup })
					chunkWidth = vim.fn.strdisplaywidth(chunkText)
					-- str width returned from truncate() may less than 2nd argument, need padding
					if curWidth + chunkWidth < targetWidth then
						suffix = suffix .. (" "):rep(targetWidth - curWidth - chunkWidth)
					end
					break
				end
				curWidth = curWidth + chunkWidth
			end
			table.insert(newVirtText, { suffix, "MoreMsg" })
			return newVirtText
		end

		require("ufo").setup({
			fold_virt_text_handler = handler,
			open_fold_hl_timeout = 150,
			close_fold_kinds = { "imports", "comment" },
			preview = {
				win_config = {
					border = { "", "─", "", "", "", "─", "", "" },
					winhighlight = "Normal:Folded",
					winblend = 0,
				},
				mappings = {
					scrollU = "<C-u>",
					scrollD = "<C-d>",
					jumpTo = "[",
					jumpBot = "]",
				},
			},
			provider_selector = function(_, filetype, _)
				return ftMap[filetype] or { "lsp", "indent" }
			end,
		})

		vim.keymap.set("n", "K", function()
			local winid = require("ufo").peekFoldedLinesUnderCursor()
			if not winid then
				vim.lsp.buf.hover()
			end
		end)

		vim.cmd([[highlight Folded guibg=NONE ctermbg=NONE]])
	end,
}
