local wezterm = require("wezterm")
local act = wezterm.action

local colors = {
	rosewater = "#F5E0DC",
	flamingo = "#F2CDCD",
	pink = "#F5C2E7",
	mauve = "#CBA6F7",
	red = "#F38BA8",
	maroon = "#EBA0AC",
	peach = "#FAB387",
	yellow = "#F9E2AF",
	green = "#A6E3A1",
	teal = "#94E2D5",
	sky = "#89DCEB",
	sapphire = "#74C7EC",
	blue = "#89B4FA",
	lavender = "#B4BEFE",

	text = "#CDD6F4",
	subtext1 = "#BAC2DE",
	subtext0 = "#A6ADC8",
	overlay2 = "#9399B2",
	overlay1 = "#7F849C",
	overlay0 = "#6C7086",
	surface2 = "#585B70",
	surface1 = "#45475A",
	surface0 = "#313244",

	base = "#1E1E2E",
	mantle = "#181825",
	crust = "#11111B",
}

local function get_process_name(tab)
  function last_word(str)
    local words = {}
    for word in string.gmatch(str, "%S+") do
        table.insert(words, word)
    end
    return words[#words]
  end

  local	word = last_word(tab.active_pane.title)

  if string.match(word, "/") then
    return nil
  else
    return string.lower(word)
  end
end

local function get_process(tab)
	local process_icons = {
		["docker"] = {
			{ Foreground = { Color = colors.blue } },
			{ Text = wezterm.nerdfonts.linux_docker },
		},
		["docker-compose"] = {
			{ Foreground = { Color = colors.blue } },
			{ Text = wezterm.nerdfonts.linux_docker },
		},
		["nvim"] = {
			{ Foreground = { Color = colors.green } },
			{ Text = wezterm.nerdfonts.custom_vim },
		},
		["vim"] = {
			{ Foreground = { Color = colors.green } },
			{ Text = wezterm.nerdfonts.dev_vim },
		},
		["node"] = {
			{ Foreground = { Color = colors.green } },
			{ Text = wezterm.nerdfonts.mdi_hexagon },
		},
		["zsh"] = {
			{ Foreground = { Color = colors.peach } },
			{ Text = wezterm.nerdfonts.dev_terminal },
		},
		["bash"] = {
			{ Foreground = { Color = colors.subtext0 } },
			{ Text = wezterm.nerdfonts.cod_terminal_bash },
		},
		["nu"] = {
			{ Foreground = { Color = colors.subtext0 } },
			{ Text = wezterm.nerdfonts.cod_terminal_bash },
		},
		["paru"] = {
			{ Foreground = { Color = colors.lavender } },
			{ Text = wezterm.nerdfonts.linux_archlinux },
		},
		["htop"] = {
			{ Foreground = { Color = colors.yellow } },
			{ Text = wezterm.nerdfonts.mdi_chart_donut_variant },
		},
		["cargo"] = {
			{ Foreground = { Color = colors.peach } },
			{ Text = wezterm.nerdfonts.dev_rust },
		},
		["go"] = {
			{ Foreground = { Color = colors.sapphire } },
			{ Text = wezterm.nerdfonts.mdi_language_go },
		},
		["lazydocker"] = {
			{ Foreground = { Color = colors.blue } },
			{ Text = wezterm.nerdfonts.linux_docker },
		},
		["git"] = {
			{ Foreground = { Color = colors.peach } },
			{ Text = wezterm.nerdfonts.dev_git },
		},
		["lazygit"] = {
			{ Foreground = { Color = colors.peach } },
			{ Text = wezterm.nerdfonts.dev_git },
		},
		["lua"] = {
			{ Foreground = { Color = colors.blue } },
			{ Text = wezterm.nerdfonts.seti_lua },
		},
		["wget"] = {
			{ Foreground = { Color = colors.yellow } },
			{ Text = wezterm.nerdfonts.mdi_arrow_down_box },
		},
		["curl"] = {
			{ Foreground = { Color = colors.yellow } },
			{ Text = wezterm.nerdfonts.mdi_flattr },
		},
		["gh"] = {
			{ Foreground = { Color = colors.mauve } },
			{ Text = wezterm.nerdfonts.dev_github_badge },
		},
	}

	local process_name = get_process_name(tab)

  if process_name == nil then
 		return wezterm.format({
			{ Foreground = { Color = colors.mauve } },
			{ Text = wezterm.nerdfonts.cod_folder },
		})
  end
  
	if process_icons[process_name] then
		return wezterm.format(process_icons[process_name])
	else
		return wezterm.format({
			{ Foreground = { Color = colors.sky } },
			{ Text = wezterm.nerdfonts.cod_terminal_powershell },
		})
	end
end

local function get_current_working_dir(tab)
  function extract_parentheses(str)
    local match = string.match(str, "%((.-)%)")
    return match
  end

	local current_dir = extract_parentheses(tab.active_pane.title)
	return current_dir == nil and string.format(" (%s)", tab.active_pane.title) or string.format(" (%s)", string.gsub(current_dir, "(.*[/\\])(.*)", "%2"))
end

wezterm.on("format-tab-title", function(tab)
	return wezterm.format({
		{ Attribute = { Intensity = "Half" } },
		{ Text = string.format(" %s  ", tab.tab_index + 1) },
		"ResetAttributes",
		{ Text = get_process(tab) },
		"ResetAttributes",
		{ Text = " " },
		{ Text = get_process_name(tab) == nil and "" or get_process_name(tab) },
		{ Text = get_current_working_dir(tab) },
		{ Text = "  " },
	})
end)

local function get_day_or_night()
	local function day_or_night()
		local current_time = os.date("%X") -- get current time in 24-hour format
		local hour = tonumber(string.sub(current_time, 1, 2)) -- extract hour from time string
		if hour >= 6 and hour < 18 then -- 6AM to 5PM is considered day time
			return "day"
		else
			return "night"
		end
	end

	local which = day_or_night()

	if which == "day" then
		return wezterm.format({
			{ Foreground = { Color = colors.peach } },
			{ Text = wezterm.nerdfonts.fa_sun_o },
		})
	else
		return wezterm.format({
			{ Foreground = { Color = colors.lavender } },
			{ Text = wezterm.nerdfonts.fa_moon_o },
		})
	end
end

wezterm.on("update-right-status", function(window)
	window:set_right_status(wezterm.format({
		{ Background = { Color = colors.crust } },
		{ Foreground = { Color = "#50fa7b" } },
		{ Text = " " },
		{ Text = get_day_or_night() },
		{ Text = "  " },
	}))
end)

return {
	-- window_background_opacity = 0.9,
	-- text_background_opacity = 1,
	font = wezterm.font("Berkeley Mono", {
		weight = "Regular",
		italic = false,
	}),
	font_size = 18.5,
	color_scheme = "Catppuccin Mocha",
	window_decorations = "RESIZE",
	window_frame = {
		font_size = 15.5,
		font = wezterm.font("Berkeley Mono", {
			italic = false,
		}),
		active_titlebar_bg = colors.crust,
		inactive_titlebar_bg = colors.mantle,
	},
	colors = {
		cursor_bg = colors.peach,
		cursor_fg = "black",
		tab_bar = {
			inactive_tab_edge = "#44475a",
			active_tab = {
				bg_color = colors.base,
				fg_color = colors.text,
			},
			inactive_tab = {
				bg_color = colors.crust,
				fg_color = colors.subtext0,
			},
			inactive_tab_hover = {
				bg_color = colors.mantle,
				fg_color = colors.green,
				italic = true,
			},
		},
	},
	keys = {
    { key = "LeftArrow", mods = "CTRL|SHIFT", action = act.ActivateTabRelative(-1) },
		{ key = "RightArrow", mods = "CTRL|SHIFT", action = act.ActivateTabRelative(1) },
		{
			key = "h",
			mods = "CTRL|SHIFT",
			action = act.ActivatePaneDirection("Left"),
		},
		{
			key = "l",
			mods = "CTRL|SHIFT",
			action = act.ActivatePaneDirection("Right"),
		},
		{
			key = "k",
			mods = "CTRL|SHIFT",
			action = act.ActivatePaneDirection("Up"),
		},
		{
			key = "j",
			mods = "CTRL|SHIFT",
			action = act.ActivatePaneDirection("Down"),
		},
		{
			key = "W",
			mods = "CTRL|SHIFT",
			action = act.AdjustPaneSize({ "Up", 5 }),
		},
		{
			key = "S",
			mods = "CTRL|SHIFT",
			action = act.AdjustPaneSize({ "Down", 5 }),
		},
		{
			key = "A",
			mods = "CTRL|SHIFT",
			action = act.AdjustPaneSize({ "Left", 5 }),
		},
		{
			key = "D",
			mods = "CTRL|SHIFT",
			action = act.AdjustPaneSize({ "Right", 5 }),
		},
		{
			key = "l",
			mods = "CTRL|SHIFT",
			action = act.ShowLauncherArgs({
				title = "Command Pallete",
				flags = "FUZZY|LAUNCH_MENU_ITEMS|TABS|COMMANDS|WORKSPACES|KEY_ASSIGNMENTS",
			}),
		}, {
      key = 'w',
      mods = "CTRL",
      action = act.CloseCurrentTab { confirm = true },
    }
	},
	show_new_tab_button_in_tab_bar = false,
	hide_tab_bar_if_only_one_tab = false,
	window_padding = {
		left = 1,
		right = 1,
		top = 0,
		bottom = 0,
	},
	line_height = 1.3,
  -- cell_width = 0.9,
	launch_menu = {
		{
			args = { "nvim" },
			set_environment_variables = {
				TERM = "wezterm",
			},
			label = string.format("%s %s", wezterm.nerdfonts.custom_vim, "Neovim"),
		},
	},
	set_environment_variables = {
		TERMINFO_DIRS = "/home/user/.nix-profile/share/terminfo",
		WSLENV = "TERMINFO_DIRS",
	},
	term = "wezterm",
	animation_fps = 60,
	front_end = "OpenGL",
  cursor_thickness = 1.85,
  cursor_blink_rate = 400,
  cursor_blink_ease_in = "Constant",
  cursor_blink_ease_out = "Constant",
  default_cursor_style = "BlinkingBar",
  default_prog = {"/opt/homebrew/bin/nu"}
}
