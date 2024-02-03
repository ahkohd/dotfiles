-- luacheck: globals vim

local on_attach = function(_, bufnr)
	local function buf_set_keymap(...)
		vim.api.nvim_buf_set_keymap(bufnr, ...)
	end

	local function buf_set_option(...)
		vim.api.nvim_buf_set_option(bufnr, ...)
	end

	--Enable completion triggered by <c-space>
	buf_set_option("omnifunc", "v:lua.vim.lsp.omnifunc")

	-- key mappings
	local opts = { noremap = true, silent = true }
	buf_set_keymap("n", "gs", "<cmd>lua vim.lsp.buf.signature_help()<CR>", opts)

	-- inlay hints
	-- if client.server_capabilities.inlayHintProvider then
	-- 	vim.lsp.inlay_hint(bufnr, true)
	-- end

	-- set up completion kind icons
	local ok, protocol = pcall(require, "vim.lsp.protocol")
	if ok then
		protocol.CompletionItemKind = {
			"", -- Text
			"", -- Method
			"", -- Function
			"", -- Constructor
			"", -- Field
			"", -- Variable
			"", -- Class
			"ﰮ", -- Interface
			"", -- Module
			"", -- Property
			"", -- Unit
			"", -- Value
			"", -- Enum
			"", -- Keyword
			"﬌", -- Snippet
			"", -- Color
			"", -- File
			"", -- Reference
			"", -- Folder
			"", -- EnumMember
			"", -- Constant
			"", -- Struct
			"", -- Event
			"ﬦ", -- Operator
			"", -- TypeParameter
		}
	end
end

return {
	"neovim/nvim-lspconfig",
	name = "lspconfig",
	event = "VeryLazy",
	dependencies = {
		"folke/neodev.nvim",
		"williamboman/mason-lspconfig.nvim",
		"williamboman/mason.nvim",
		"hrsh7th/cmp-nvim-lsp",
		"mfussenegger/nvim-dap",
		"jay-babu/mason-nvim-dap.nvim",
		{
			"mrcjkb/rustaceanvim",
			version = "^3",
			ft = { "rust" },
		},
	},
	config = function()
		require("mason").setup({
			max_concurrent_installers = 12,
		})

		vim.api.nvim_create_user_command("LspConfigShow", function()
			vim.notify(vim.inspect(vim.lsp.get_active_clients()))
		end, { desc = "Show LSP settings" })

		vim.api.nvim_create_user_command("LspConfigReload", function()
			vim.lsp.stop_client(vim.lsp.get_active_clients(), true)
			vim.cmd.edit()
		end, { desc = "Reload LSP settings" })

		vim.lsp.handlers["textDocument/publishDiagnostics"] = vim.lsp.with(vim.lsp.diagnostic.on_publish_diagnostics, {
			underline = true,
			virtual_text = {
				spacing = 4,
				prefix = "",
			},
		})

		require("neodev").setup({
			library = { plugins = { "nvim-dap-ui" }, types = true },
		})

		local lsp = require("lspconfig")
		local server_configs = {
			vimls = {
				on_attach,
			},
			lua_ls = {
				on_attach,
				settings = {
					Lua = {
						runtime = { version = "LuaJIT" },
						completion = { callSnippet = "Replace" },
						diagnostics = { globals = require("core.utils.lsp").lua_globals },
						format = { enable = false },
						hint = { enable = true },
						telemetry = { enable = false },
						workspace = { checkThirdParty = false, library = vim.api.nvim_get_runtime_file("", true) },
					},
				},
			},
			css_ls = {
				on_attach,
			},
			cssmodules_ls = {
				on_attach,
			},
			biome = {
				on_attach,
				-- disable LSP if biome.json is not found
				disabled = function()
					local root_dir = require("lspconfig.util").find_git_ancestor(vim.fn.getcwd())
					local biome_config_path = root_dir and (root_dir .. "/biome.json") or ""
					if root_dir and vim.fn.filereadable(biome_config_path) == 1 then
						return false
					else
						return true
					end
				end,
			},
			tsserver = {
				on_attach,
				settings = {
					typescript = {
						inlayHints = {
							includeInlayParameterNameHints = "all",
							includeInlayParameterNameHintsWhenArgumentMatchesName = false,
							includeInlayFunctionParameterTypeHints = true,
							includeInlayVariableTypeHints = true,
							includeInlayVariableTypeHintsWhenTypeMatchesName = false,
							includeInlayPropertyDeclarationTypeHints = true,
							includeInlayFunctionLikeReturnTypeHints = true,
							includeInlayEnumMemberValueHints = true,
						},
					},
					javascript = {
						inlayHints = {
							includeInlayParameterNameHints = "all",
							includeInlayParameterNameHintsWhenArgumentMatchesName = false,
							includeInlayFunctionParameterTypeHints = true,
							includeInlayVariableTypeHints = true,
							includeInlayVariableTypeHintsWhenTypeMatchesName = false,
							includeInlayPropertyDeclarationTypeHints = true,
							includeInlayFunctionLikeReturnTypeHints = true,
							includeInlayEnumMemberValueHints = true,
						},
					},
				},
			},
		}

		require("mason-lspconfig").setup()
		require("mason-lspconfig").setup_handlers({
			function(name)
				local config = server_configs[name] or {}
				local ok, cmp_nvim_lsp = pcall(require, "cmp_nvim_lsp")
				if ok then
					local orig = vim.lsp.protocol.make_client_capabilities()
					config.capabilities = cmp_nvim_lsp.default_capabilities(orig)
				end

				-- disable LSP if disabled() returns true
				if config.disabled and config.disabled() then
					return
				end

				lsp[name].setup(config)
			end,
		})

		-- configure rustaceanvim
		local rust_config = function()
			-- Update this path
			local extension_path = vim.env.HOME .. "/.local/share/nvim/mason/packages/codelldb/extension/"
			local codelldb_path = extension_path .. "adapter/codelldb"
			local liblldb_path = extension_path .. "lldb/lib/liblldb"
			local this_os = vim.loop.os_uname().sysname

			-- The path is different on Windows
			if this_os:find("Windows") then
				codelldb_path = extension_path .. "adapter\\codelldb.exe"
				liblldb_path = extension_path .. "lldb\\bin\\liblldb.dll"
			else
				-- The liblldb extension is .so for Linux and .dylib for MacOS
				liblldb_path = liblldb_path .. (this_os == "Linux" and ".so" or ".dylib")
			end

			local cfg = require("rustaceanvim.config")

			return {
				dap = {
					adapter = cfg.get_codelldb_adapter(codelldb_path, liblldb_path),
				},
				server = {
					on_attach = function(client, bufnr)
						on_attach(client, bufnr)
					end,
				},
			}
		end

		vim.g.rustaceanvim = rust_config()

		-- configure DAP
		require("mason-nvim-dap").setup({
			ensure_installed = { "codelldb" },
			automatic_install = true,
			handlers = {},
		})
	end,
}
