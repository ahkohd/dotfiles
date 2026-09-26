---
description: Run the weekly BB update check
---

Run the existing central BB update automation. Its regular schedule is Sunday at 6am UTC.

Check that it exists and is enabled:

```sh
bb automation show auto_0k7zojmseb0 --project proj_uqrh4369rg --json
```

If it is missing, paused or invalid, report that and stop. Do not create a replacement or change its schedule.

Start a check:

```sh
bb automation run auto_0k7zojmseb0 --project proj_uqrh4369rg --json
```

The automation runs on agentctl, backs up first and skips busy periods. Leave those safeguards in place. Do not update BB locally on Homestead, interrupt other threads, or update provider CLIs, plugins or Nix packages.

Read the run result with `bb automation runs auto_0k7zojmseb0 --project proj_uqrh4369rg --limit 1 --json` and inspect its thread output. Report whether the update ran, was skipped or is still pending. Verify the running version with `bb settings version --force --json` before claiming an upgrade succeeded.
