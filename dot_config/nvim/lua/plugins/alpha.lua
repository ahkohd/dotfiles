-- luacheck: globals vim

return {
	{
		"goolord/alpha-nvim",
		lazy = true,
		event = "VimEnter",
		config = function()
			local headers = require("core.ui.alpha.headers")
			local quotes = require("core.ui.alpha.quotes")
			local theme = require("alpha.themes.theta")
			local path_ok, plenary_path = pcall(require, "plenary.path")
			if not path_ok then
				return
			end

			math.randomseed(os.time())

			local function apply_gradient_hl(text)
				-- no clown fiesta
				-- local gradient = require("core.ui.alpha.utils").create_gradient("#E1E1E1", "#202020", #text)
				-- embark
				local gradient = require("core.ui.alpha.utils").create_gradient("#91ddff", "#cbe3e7", #text)

				local lines = {}
				for i, line in ipairs(text) do
					local tbl = {
						type = "text",
						val = line,
						opts = {
							hl = "HeaderGradient" .. i,
							shrink_margin = false,
							position = "center",
						},
					}
					table.insert(lines, tbl)

					-- create hl group
					vim.api.nvim_set_hl(0, "HeaderGradient" .. i, { fg = gradient[i] })
				end

				return {
					type = "group",
					val = lines,
					opts = { position = "center" },
				}
			end

			local function get_header(list)
				local header_text = list[math.random(#list)]
				return apply_gradient_hl(header_text)
			end

			-- Footer
			local function get_footer(list, width)
				local quote_text = list[math.random(#list)]

				local max_width = width or 35

				local tbl = {}
				for _, text in ipairs(quote_text) do
					local padded_text = require("core.ui.alpha.utils").pad_string(text, max_width, "right")
					table.insert(
						tbl,
						{ type = "text", val = padded_text, opts = { hl = "Comment", position = "center" } }
					)
				end

				return {
					type = "group",
					val = tbl,
					opts = {},
				}
			end

			local dashboard = require("alpha.themes.dashboard")

			-- Links / tools
			local function get_tools()
				local tbl = {
					{ type = "text", val = "˶ᵔ ᵕ ᵔ˶", opts = { hl = "SpecialComment", position = "center" } },
					{
						type = "group",
						val = {
							dashboard.button("p", " Open project", "<cmd>Telescope project<CR>"),
							dashboard.button("x", " Recent sessions", "<cmd>Telescope persisted<CR>"),
							dashboard.button(
								"o",
								" Take notes",
								"<cmd>lua require('core.utils.obsidian').open()<CR>"
							),
							dashboard.button("l", " Extensions...", "<cmd>Lazy<CR>"),
							dashboard.button("m", " Packages...", "<cmd>Mason<CR>"),
							dashboard.button("q", " Quit", "<cmd>qa!<CR>"),
						},
						position = "center",
					},
				}
				return { type = "group", val = tbl, opts = {} }
			end

			-- MRU
			local function get_mru(max_shown)
				local tbl = {
					{ type = "text", val = "Recent Files", opts = { hl = "SpecialComment", position = "center" } },
				}

				local mru_list = theme.mru(1, "", max_shown)
				for _, file in ipairs(mru_list.val) do
					table.insert(tbl, file)
				end

				return { type = "group", val = tbl, opts = {} }
			end

			-- Projects
			local function get_projects(max_shown)
				local alphabet = "abcdefgnqrsuvwxyz"

				local tbl = {
					{ type = "text", val = "Recent Projects", opts = { hl = "SpecialComment", position = "center" } },
				}

				local project_list = require("telescope._extensions.project.utils").get_projects("recent")
				for i, project in ipairs(project_list) do
					if i > max_shown then
						break
					end

					local icon = " "

					-- create shortened path for display
					local target_width = 32
					local display_path = project.path
					if #display_path > target_width then
						display_path = plenary_path.new(display_path):shorten(1, { -2, -1 })
						if #display_path > target_width then
							display_path = plenary_path.new(display_path):shorten(1, { -1 })
						end
					end

					-- Get semantic letter for project
					local letter
					local project_name = display_path:match("[^/\\]+$") -- Gets the last part after a slash or backslash
					if not project_name or project_name == "" then
						project_name = display_path -- Fallback to using the entire display_path
					end
					project_name = project_name:gsub("[^%w]", "") -- Remove non-alphanumeric characters
					letter = project_name:sub(1, 1):lower()

					-- Check if the letter is in the alphabet and get alternate letter if not available
					if not letter:match("^[%w]$") or not alphabet:find(letter, 1, true) then -- True for plain search
						letter = alphabet:sub(1, 1)
					end

					-- Remove the selected letter from the alphabet
					alphabet = alphabet:gsub(letter, "", 1) -- Replace only the first occurrences

					-- create button element
					local file_button_el = dashboard.button(
						letter,
						icon .. display_path,
						"<cmd>lua require('core.utils.project').open_project('"
							.. project.path:gsub("\\", "/")
							.. "')<cr>"
					)

					-- create hl group for the start of the path
					local fb_hl = {}
					table.insert(fb_hl, { "Comment", 0, #icon + #display_path - #project_name })
					file_button_el.opts.hl = fb_hl

					table.insert(tbl, file_button_el)
				end

				return {
					type = "group",
					val = tbl,
					opts = {},
				}
			end

			-- Layout
			theme.config.layout = {
				{ type = "padding", val = 4 },
				get_header({ headers.neovim, headers.opa, headers.cat }),
				{ type = "padding", val = 1 },
				get_tools(),
				{ type = "padding", val = 2 },
				get_projects(4),
				{ type = "padding", val = 2 },
				get_mru(4),
				{ type = "padding", val = 3 },
				get_footer({ quotes.yoda }, 50),
			}

			-- Function to disable lualine
			local function disable_lualine()
				vim.g.lualine_active = false
				require("lualine").refresh()
			end

			-- Function to enable lualine
			local function enable_lualine()
				vim.g.lualine_active = true
				require("lualine").refresh()
			end

			-- Autocmd to disable lualine on entering Alpha dashboard
			vim.api.nvim_create_autocmd("FileType", {
				pattern = "alpha",
				callback = disable_lualine,
			})

			-- Autocmd to enable lualine on leaving Alpha dashboard
			vim.api.nvim_create_autocmd({ "BufEnter", "WinEnter" }, {
				pattern = "*",
				callback = enable_lualine,
			})

			require("alpha").setup(theme.config)
		end,
	},
}
