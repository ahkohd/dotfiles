-- luacheck: globals vim

return {
	"rcarriga/nvim-dap-ui",
	dependencies = { "theHamsta/nvim-dap-virtual-text" },
	after = "nvim-dap",
	event = "VeryLazy",
	keys = {
		{
			"<space>bt",
			"<cmd>lua require('dapui').toggle() <cr>",
			desc = "Toggle debugger UI",
		},
		{
			"<space>br",
			"<cmd>lua require('dapui').open({reset = true}) <cr>",
			desc = "Reset and open debugger UI",
		},
		{
			"<space>bb",
			"<cmd>lua require('dap').toggle_breakpoint()<cr>",
			desc = "Set breakpoint",
		},
		{
			"<space>bB",
			"<cmd>lua require('dap').set_breakpoint(vim.fn.input('Breakpoint condition: '))<cr>",
			desc = "Set breakpoint with condition",
		},
		{
			"<space>bp",
			"<cmd>lua require('dap').set_breakpoint(nil, nil, vim.fn.input('Log point message: '))<cr>",
			desc = "Set log point",
		},
		{
			"<space>br",
			"<cmd>lua require('dap').repl.open()<cr>",
			desc = "Open REPL",
		},
		{
			"<space>bl",
			"<cmd>lua require('dap').run_last()<cr>",
			desc = "Run last configuration",
		},
		{
			"<space>b1",
			function()
				-- load launch.json if present
				require("dap.ext.vscode").load_launchjs(nil, {
					codelldb = { "c", "cpp", "rust" },
					node = {
						"javascript",
						"javascriptreact",
						"typescriptreact",
						"typescript",
					},
				})

				require("dap").continue()
			end,
			desc = "Continue",
		},
		{
			"<space>b2",
			"<cmd>lua require('dap').step_over()<cr>",
			desc = "Step over",
		},
		{ "<space>b3", "<cmd>lua require('dap').step_into()<cr>", desc = "Step into" },
		{ "<space>b4", "<cmd>lua require('dap').step_out()<cr>", desc = "Step out" },
		{ "<space>b5", "<cmd>lua require('dap').close()<cr>", desc = "Stop debuging" },
		{
			"<space>bk",
			"<cmd>lua require('dap.ui.widgets').hover()<cr>",
			desc = "Hover variable under cursor",
		},
		{
			"<space>b8",
			"<cmd>RustLsp debuggables<cr>",
			desc = "Show debuggables (Rust)",
		},
		{
			"<space>b9",
			"<cmd>RustLsp runnables<cr>",
			desc = "Show runnables (Rust)",
		},
	},
	config = function()
		local dap, dapui = require("dap"), require("dapui")

		require("dapui").setup()

		dap.listeners.before.attach.dapui_config = function()
			dapui.open()
		end
		dap.listeners.before.launch.dapui_config = function()
			dapui.open()
		end
		dap.listeners.before.event_terminated.dapui_config = function()
			dapui.close()
		end
		dap.listeners.before.event_exited.dapui_config = function()
			dapui.close()
		end

		require("nvim-dap-virtual-text").setup()
	end,
}
