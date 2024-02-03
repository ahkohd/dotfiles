local M = {}

M.includes = function(table, value)
	for _, v in pairs(table) do
		if v == value then
			return true
		end
	end
	return false
end

return M
