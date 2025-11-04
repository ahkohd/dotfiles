#!/usr/bin/osascript

# Required parameters:
# @raycast.schemaVersion 1
# @raycast.title focus devtools
# @raycast.mode silent

# Optional parameters:
# @raycast.icon 🛠️

# Documentation:
# @raycast.author user_450f697d0d170e6ecd79
# @raycast.authorURL https://raycast.com/user_450f697d0d170e6ecd79

tell application "System Events"
	set browserNames to { "Electron" }

	repeat with browserName in browserNames
		if exists process browserName then
			try
				-- Filter windows directly in query
				set matchingWindows to (windows of process browserName whose title starts with "Developer Tools")
				if (count of matchingWindows) > 0 then
					set frontmost of process browserName to true
					perform action "AXRaise" of item 1 of matchingWindows
					# return "Focused: " & (title of item 1 of matchingWindows)
          return
				end if
			end try
		end if
	end repeat

	return "No Developer Tools window found"
end tell
