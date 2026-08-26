---
name: companion-attention
description: Send completion notifications or explicit decision requests to the local Companion display, then read the user's response. Use when an agent should notify the user or needs their attention on the companion device.
---

# Companion attention

Use `companion` on this computer. Run `companion help` for commands and `companion animations` for animation IDs. The bridge must be running. `COMPANION_URL` can select a different localhost port.

Give each agent session a stable, unique `owner`. Keep the returned message ID. Update and clear only your own messages. Messages are temporary and do not survive a bridge restart; a missing message is not a user decision.

Send JSON through a file or a quoted stdin heredoc. Do not interpolate untrusted message text into shell commands.

```sh
companion show --json - <<'JSON'
{"owner":"agent-build-123","kind":"notification","title":"Build passed","description":"All checks are complete","animation":"done"}
JSON
```

Notifications expire after 10 seconds of visible time. `durationMs` overrides this, from 1000 to 300000 milliseconds. The timer pauses while the user reads the detail view. Avoid repeated notifications for unchanged progress.

The user can double-tap the face or detail view to dismiss any request. This returns `outcome: "dismissed"` with `action: null`, never approval. Detail actions are stacked vertically; default decision labels are Approve and Decline.

For a decision, use two clearly labelled actions and explain the concrete choice in `body`:

```sh
companion show --json - <<'JSON'
{"owner":"agent-build-123","kind":"decision","title":"Review ready","description":"Open the proposed change?","body":"The change and checks are ready. Choose Open review to continue, or Cancel to leave it pending.","animation":"blocked","actions":[{"id":"open-review","label":"Open review","kind":"respond"},{"id":"cancel","label":"Cancel","kind":"respond"}]}
JSON
```

`companion wait --id MESSAGE_ID --timeout 300` returns a terminal result as JSON. Only a result with `outcome: "responded"` and the expected `action` ID is an affirmative decision. A zero exit code means a terminal result was found, not that the user approved it. Opening details, timeout, expiry, dismissal, cancellation, bridge errors and missing results are not approval. Waiting times out with exit code 2 and leaves the request unchanged. The device returns action events; your agent decides how to handle them within its existing permissions. For the example above, require both `outcome: "responded"` and `action: "open-review"` on the matching message ID. A result with `action: "cancel"` never authorizes opening the review.

Limits: title 24 characters, short description 48, detail body 480, each action label 16. Use concise text; width also depends on the chosen device font. Overlong text is rejected. Choose one or two actions: `dismiss` closes, `respond` returns a named result, or `next` advances a chain. Action IDs `open` and `back` are reserved.

For a chain, supply `steps` with up to eight objects containing title, description, body, animation and actions. A `next` action advances to the next step; finish with `respond` or `dismiss`. Do not put an important decision behind a notification timeout: use `kind: "decision"`.

Use `companion update --id MESSAGE_ID --owner OWNER --json update.json` to change a pending message, or `companion clear --id MESSAGE_ID --owner OWNER` when it is no longer relevant. An update invalidates old tap events. `companion status` lists active, queued and recent results. Do not manufacture a tap response through the HTTP API to complete a real user decision.

## Receive a callback

To receive the result without keeping `companion wait` running, attach a generic callback to the request:

```json
{"callback":{"command":"/absolute/path/to/handle-response","args":[],"env":{"MY_REQUEST_CONTEXT":"review-123"}}}
```

Companion starts that command once when the request finishes and writes the result JSON to its standard input. This includes responses, dismissals, expiry, clearing and disabling. Opening details or advancing to the next screen does not finish a request. No shell is implied; use an explicit shell command if your callback needs one.

Keep callbacks short: they have a 5-second timeout. Delivery status appears in the result's `callbackDelivery` field. Failed deliveries are not retried automatically; use `companion status` or `companion wait` to recover the result. The queue is not persistent across bridge restarts.

The callback should notify the originating agent, which checks the matching request ID, outcome and action before deciding what to do. Avoid notifying again about receipt and creating a notification loop.

### Tip for agents running in Herdr

You can use the generic callback to send the result back to your own pane with `herdr agent prompt`. Companion has no Herdr-specific delivery logic. Capture your explicit pane and socket from your agent environment; never use the UI-focused pane. If these are unavailable, use `companion wait` or resolve your caller context using Herdr's instructions.

For example, construct a request from inside your Herdr pane:

```sh
node <<'JS' | companion show --json -
const { HERDR_ENV, HERDR_PANE_ID, HERDR_SOCKET_PATH } = process.env;
if (HERDR_ENV !== '1' || !HERDR_PANE_ID || !HERDR_SOCKET_PATH) {
  throw Error('Resolve your explicit Herdr pane and socket before adding a callback.');
}
console.log(JSON.stringify({
  owner: `review-${HERDR_PANE_ID}`,
  kind: 'decision', title: 'Review ready', description: 'Tap to make a choice',
  callback: {
    command: '/bin/sh',
    args: ['-c', 'result=$(cat); exec herdr agent prompt "$1" "$result"',
      'companion-response', HERDR_PANE_ID],
    env: { HERDR_SOCKET_PATH }
  }
}));
JS
```

The result stays data passed as one argument; do not evaluate it as shell code. If your pane moves or your agent session is replaced, update or clear the outstanding request. Ignore callback messages for request IDs you do not own.
