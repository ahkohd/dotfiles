require("eza-preview"):setup({
	default_tree = true,
	level = 2,
	follow_symlinks = true,
	dereference = false,
	all = true,
	ignore_glob = { ".jj" },
	git_ignore = true,
	git_status = false,
})

require("no-status"):setup()

local bookmarks = {}
local path_sep = package.config:sub(1, 1)
local home_path = ya.target_family() == "windows" and os.getenv("USERPROFILE") or os.getenv("HOME")

if ya.target_family() == "windows" then
  table.insert(bookmarks, {
    tag = "Scoop Local",

    path = (os.getenv("SCOOP") or home_path .. "\\scoop") .. "\\",
    key = "p"
  })
  table.insert(bookmarks, {
    tag = "Scoop Global",
    path = (os.getenv("SCOOP_GLOBAL") or "C:\\ProgramData\\scoop") .. "\\",
    key = "P"
  })
end
table.insert(bookmarks, {
  tag = "Desktop",
  path = home_path .. path_sep .. "Desktop" .. path_sep,
  key = "d"
})

require("yamb"):setup {
  bookmarks = bookmarks,
  jump_notify = true,
  cli = "fzf",
  keys = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
  path = (ya.target_family() == "windows" and os.getenv("APPDATA") .. "\\yazi\\config\\bookmark") or
        (os.getenv("HOME") .. "/.config/yazi/bookmark"),
}
