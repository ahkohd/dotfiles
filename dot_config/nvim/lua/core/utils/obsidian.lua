-- luacheck: globals vim

local M = {}

M.open = function()
	local home_dir = vim.env.HOME
	local vault_path = home_dir .. "/vaults"
	require("core.utils.project").open_project(vault_path)
end

return M
