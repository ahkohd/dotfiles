-- luacheck: globals vim

return {
	"aktersnurra/no-clown-fiesta.nvim",
	lazy = false,
	priority = 1000,
	config = function()
		require("no-clown-fiesta").setup({
			transparent = not vim.g.neovide, -- Enable this to disable the bg color
			styles = {
				-- You can set any of the style values specified for `:h nvim_set_hl`
				comments = {},
				keywords = {},
				functions = {},
				variables = {},
				type = { bold = false },
				lsp = { underline = true },
			},
		})
		vim.cmd("colorscheme no-clown-fiesta")
		vim.cmd("highlight LspInlayHint guifg=#373737")
		vim.cmd("highlight NoiceCmdlineIconCmdline guifg=#D0D0D0")
		vim.cmd("highlight NoiceCmdlineIconSearch guifg=#D0D0D0")

		-- notify.nvim highlights
		vim.cmd("highlight NotifyINFOBorder guifg=#373737")
		vim.cmd("highlight NotifyERRORBorder guifg=#373737")
		vim.cmd("highlight NotifyWARNBorder guifg=#373737")
		vim.cmd("highlight NotifyDEBUGBorder guifg=#373737")
		vim.cmd("highlight NotifyTRACEBorder guifg=#373737")
		vim.cmd("highlight NotifyINFOTitle guifg=#90A959")
		vim.cmd("highlight NotifyINFOIcon guifg=#90A959")
		vim.cmd("highlight NotifyERRORTitle guifg=#b46958")
		vim.cmd("highlight NotifyERRORIcon guifg=#b46958")
		vim.cmd("highlight NotifyWARNIcon guifg=#FFA557")
		vim.cmd("highlight NotifyWARNTitle guifg=#FFA557")
		vim.cmd("highlight NotifyDEBUGIcon guifg=#373737")
		vim.cmd("highlight NotifyDEBUGTitle guifg=#373737")
		vim.cmd("highlight NotifyTRACEIcon guifg=#576f82")
		vim.cmd("highlight NotifyTRACETitle guifg=#576f82")
	end,
}
