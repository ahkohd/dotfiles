-- luacheck: globals vim

local M = {}

M.root_dir = function()
	return require("lspconfig.util").find_git_ancestor(vim.fn.getcwd())
end

M.cwd_to_root_dir = function()
	local root_dir = M.root_dir()
	vim.cmd([[cd ]] .. root_dir)
end

M.cwd_to_root_dir_of_current_buffer = function()
	vim.cmd([[cd %:p:h]])
	M.cwd_to_root_dir()
end

M.open_project = function(project_path)
	local actions = require("telescope.actions")
	require("telescope.builtin").find_files({
		cwd = project_path,
		attach_mappings = function(prompt_bufnr, _)
			actions.select_default:replace(function()
				actions.file_edit(prompt_bufnr)
				M.cwd_to_root_dir_of_current_buffer()
			end)
			return true
		end,
	})
end

M.open_file = function(file_path)
	vim.cmd("edit " .. file_path)
	M.cwd_to_root_dir()
end

return M
