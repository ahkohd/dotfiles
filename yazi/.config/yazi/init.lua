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

require("starship"):setup()
