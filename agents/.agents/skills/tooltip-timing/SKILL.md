---
name: tooltip-timing
description: When tooltips and teaching tips should show, and when they must not, with macOS's measured timings. Use when building or reviewing hover tooltips, help tags, coach marks, feature tips or onboarding cards on any platform, or when someone says tips are annoying, show up when they shouldn't, or flicker while moving the pointer.
---

# Tooltip timing

Most apps show tips too early and too often. macOS rarely annoys, and not
because it is clever: it waits long, cools fast, and gets out of the way.
Copy those rules before tuning anything else.

## What macOS does (measured)

Standard AppKit tooltips, macOS 26, measured November 2026 with
`references/tooltip-probe.swift` (synthetic pointer, tip found in the
window list):

| Situation | Result |
|---|---|
| Pointer arrives on a control and rests | Tip after about 1.5 s (1458 to 1541 ms) |
| Pointer keeps moving slowly inside the control | Still about 1.5 s: the clock starts on entry, not on rest |
| A tip is up; pointer glides straight to a neighbour | Neighbour's tip at once |
| Pointer leaves to empty space for 0.3 s or more, then a neighbour | Full 1.5 s again |
| Click on the control | Tip goes, and stays away until the pointer leaves and comes back |
| Modifier key press | Tip stays |
| App is not frontmost | No tip |
| Long rest | Tip hides on its own, gone within 10 s |

Windows is the same shape, faster: first wait equals the double-click time
(500 ms by default), re-show between tools 100 ms, auto-hide 10 times the
wait. Web libraries go faster still (Radix: 700 ms, 300 ms warm), which is
where "most apps get it wrong" comes from.

## Plain tooltips: the rules

1. **Wait 1.2 to 1.5 s on desktop.** Below about 1 s, a pointer crossing a
   toolbar on the way somewhere else raises tips. Count from entry; a
   pointer still there after 1.5 s is there on purpose.
2. **Warm only control to control.** Once a tip is up, the next control's
   tip shows at once, but only when the pointer goes straight there
   (cool within about 150 ms). Empty space resets the full wait.
3. **A press hides the tip until the pointer leaves.** Clicking says "I know
   what this is". Do not re-arm while the pointer stays.
4. **Only for the app in use.** No tips while the app is not frontmost. A
   floating panel over another app's window (HUD, overlay, palette) is the
   classic offender: the pointer crosses it constantly while the person
   works elsewhere. If the panel must show tips while inactive, demand a
   real rest first (see below).
5. **Never while the person is working.** Suppress during a drag, while
   drawing, typing, recording, scrolling, or with a menu or popover open.
6. **A control that appears under a parked pointer does not count as a
   hover.** Arm only on a real pointer move.
7. **Leave instantly, no exit animation of note.** A tip that lingers over
   the next target is in the way.
8. **Keep text to a name and maybe a shortcut.** If it needs a sentence of
   instructions, it is not a tooltip (below). Never put task-critical
   information in a tooltip; it disappears.
9. **Keyboard focus shows it too**, after a held focus, not while tabbing
   through.

## Teaching tips are not tooltips

A card that explains a feature (a demo, a title and hints) is just-in-time
help. Showing it on every hover is the main source of "tips are annoying".
Run it on TipKit's rules, whatever the platform:

1. **A real rest, about 2 s**, with the pointer near still, not just
   arrival. Restart the wait on each move. A pass never earns a card.
2. **Cap it.** Each card at most two or three times, ever. At most one
   teaching card per session (or per day, TipKit's `.daily`).
3. **Retire on use, permanently.** Once the person has used the feature,
   that card never shows again. Store this durably (user defaults), not in
   memory: an app that relaunches on every update, login or crash would
   otherwise re-teach an expert after each one.
4. **Fall back to the plain tooltip** once a card is retired or capped.
5. **Offer a way back:** a "Show tips again" control in Settings resets the
   retired set. That is cheaper than guessing when to re-teach.
6. **Not mid-task**: same suppression as rule 5 above, and never over an
   open popover.
7. **One at a time.** Moving between controls of one group may swap the
   card's contents in place; never stack two cards.

## Review checklist

- [ ] First wait 1.2 to 1.5 s (desktop), counted from entry
- [ ] Warm hand-off only control to control, cools in about 150 ms
- [ ] Press hides until exit; key presses other than modifiers may hide too
- [ ] No tips while the app is not frontmost, or a rest is required
- [ ] Suppressed during drags, drawing, typing, recording and open menus
- [ ] Teaching cards: 2 s rest, display cap, one per session, retired on
      use and stored across launches, plain tooltip after, reset in Settings

## Re-measure

Build `references/tooltip-probe.swift` with `swiftc -O`, sign it, grant it
Accessibility and Screen Recording, and launch it in the logged-in session.
It must wait asynchronously: blocking the main thread with nested run loops
stops AppKit from handling the pointer, and no tip ever shows. On macOS 26
the tip is a window in the tooltip layer (2147483630) owned by the Window
Server, not by the app.

## Sources

- Microsoft, TTM_GETDELAYTIME: https://learn.microsoft.com/en-us/windows/win32/Controls/ttm-getdelaytime
- Radix Tooltip: https://radix-ui.com/primitives/docs/components/tooltip
- NN/g, Tooltip Guidelines: https://nngroup.com/articles/tooltip-guidelines
- Apple HIG, Offering help: https://developer.apple.com/design/human-interface-guidelines/offering-help
- WWDC23, Make features discoverable with TipKit: https://developer.apple.com/videos/play/wwdc2023/10229/
- TipKit maxDisplayCount: https://developer.apple.com/documentation/tipkit/tip/maxdisplaycount
