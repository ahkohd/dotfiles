-- luacheck: globals vim

return {
	"nvim-lualine/lualine.nvim",
	dependencies = { "nvim-tree/nvim-web-devicons", "arkav/lualine-lsp-progress" },
	event = "BufReadPost",
	config = function()
		local icons = require("core.ui.icons")

		-- local trans_colors = {
		-- 	bg = nil,
		-- 	fg = "#D0D0D0",
		-- }
		-- local transparent_theme = {
		-- 	normal = {
		-- 		a = { fg = trans_colors.fg, bg = trans_colors.bg, gui = "bold" },
		-- 		b = { fg = trans_colors.fg, bg = trans_colors.bg },
		-- 		c = { fg = trans_colors.fg, bg = trans_colors.bg },
		-- 	},
		-- 	insert = { a = { fg = trans_colors.fg, bg = trans_colors.bg, gui = "bold" } },
		-- 	visual = { a = { fg = trans_colors.fg, bg = trans_colors.bg, gui = "bold" } },
		-- 	command = { a = { fg = trans_colors.fg, bg = trans_colors.bg, gui = "bold" } },
		-- 	replace = { a = { fg = trans_colors.fg, bg = trans_colors.bg, gui = "bold" } },
		-- 	inactive = {
		-- 		a = { fg = trans_colors.fg, bg = trans_colors.bg },
		-- 		b = { fg = trans_colors.fg, bg = trans_colors.bg },
		-- 		c = { fg = trans_colors.fg, bg = trans_colors.bg },
		-- 	},
		-- }

		local embark_colors = {
			space0 = "#100e23",
			space1 = "#191729",
			space2 = "#2d2b40",
			space3 = "#3e3859",
			space4 = "#585273",
			astral1 = "#cbe3e7",
			cyan = "#aaffe4",
			darkcyan = "#63f2f1",
			yellow = "#ffe9aa",
			darkyellow = "#ffb378",
			red = "#f48fb1",
			darkred = "#ff5458",
			green = "#a1efd3",
			darkgreen = "#62d196",
			purple = "#d4bfff",
			nebula10 = "#78A8ff",
			nebula11 = "#7676ff",
		}

		local embark = {
			normal = {
				a = { fg = embark_colors.space4, bg = embark_colors.space2 },
				b = { fg = embark_colors.space4, bg = embark_colors.space1 },
				c = { fg = embark_colors.space4, bg = embark_colors.space0 },
				x = { fg = embark_colors.space4, bg = embark_colors.space0 },
				y = { fg = embark_colors.space4, bg = embark_colors.space1 },
				z = { fg = embark_colors.space4, bg = embark_colors.space2 },
			},
			visual = {
				a = { fg = embark_colors.space0, bg = embark_colors.yellow, gui = "bold" },
				b = { fg = embark_colors.space0, bg = embark_colors.darkyellow },
			},
			insert = {
				a = { fg = embark_colors.darkcyan, bg = embark_colors.space2 },
				b = { fg = embark_colors.space4, bg = embark_colors.space1 },
				c = { fg = embark_colors.space4, bg = embark_colors.space0 },
				x = { fg = embark_colors.space4, bg = embark_colors.space0 },
				y = { fg = embark_colors.space4, bg = embark_colors.space1 },
				z = { fg = embark_colors.space4, bg = embark_colors.space2 },
			},
			replace = {
				a = { fg = embark_colors.space0, bg = embark_colors.nebula10, gui = "bold" },
				b = { fg = embark_colors.space0, bg = embark_colors.nebula11 },
			},
			inactive = {
				a = { fg = embark_colors.space4, bg = embark_colors.space1, gui = "bold" },
				b = { fg = embark_colors.space4, bg = embark_colors.space1 },
				c = { fg = embark_colors.space4, bg = embark_colors.space2 },
				x = { fg = embark_colors.space0, bg = embark_colors.purple },
			},
		}

		local disable = {
			"neogitstatus",
			"netrw",
			"lir",
			"lazy",
			"alpha",
			"Outline",
			"NeogitStatus",
			"NeogitCommitMessage",
		}

		local ignore = { "help", "TelescopePrompt" }

		local function hide_in_width()
			return vim.fn.winwidth(0) > 80
		end

		local space = {
			" ",
		}

		local diagnostics = {
			"diagnostics",
			sources = { "nvim_diagnostic" },
			sections = { "error", "warn" },
			symbols = {
				error = icons.error .. " ",
				warn = icons.warn .. " ",
			},
			colored = false,
			padding = 0,
			update_in_insert = false,
		}

		local diff = {
			"diff",
			colored = false,
			cond = hide_in_width,
		}

		local branch = {
			"branch",
			icon = icons.git,
		}

		local filetype = {
			"filetype",
			icon_only = true,
			colored = false,
			cond = hide_in_width,
		}

		local function lsp_client_names()
			local clients = vim.lsp.get_active_clients()
			if next(clients) == nil then
				return ""
			end
			local client_names = {}
			for _, client in pairs(clients) do
				table.insert(client_names, client.name)
			end
			return table.concat(client_names, ", ")
		end

		local language_server = {
			lsp_client_names,
		}

		local lsp_progress = {
			"lsp_progress",
			display_components = { { "title", "percentage", "message" } },
			timer = {
				progress_enddelay = 500,
				lsp_client_name_enddelay = 500,
			},
		}

		local opts = {
			options = {
				icons_enabled = true,
				-- theme = "embark",
				theme = embark,
				component_separators = "",
				section_separators = { left = "", right = " " },
				-- section_separators = { left = "", right = "" },
				disabled_filetypes = disable,
				ignore_focus = ignore,
				always_divide_middle = true,
				globalstatus = true,
			},
			sections = {
				lualine_a = { filetype, "filename" },
				lualine_b = { branch },
				lualine_c = { space, diff, diagnostics },
				lualine_x = { lsp_progress, language_server },
				lualine_y = { "progress" },
				lualine_z = { "location" },
			},
			inactive_sections = {
				lualine_a = { "mode" },
				lualine_b = {},
				lualine_c = {},
				lualine_x = {},
				lualine_y = {},
				lualine_z = { "location" },
			},
			extensions = {},
		}

		require("lualine").setup(opts)

		vim.cmd([[
		    hi StatusLine guibg=NONE ctermbg=NONE
		    hi StatusLineNC guibg=NONE ctermbg=NONE
		  ]])
	end,
}
