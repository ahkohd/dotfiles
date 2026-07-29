---
name: liquid-glass-rim
description: Getting Liquid Glass to render its specular rim (and its shadow) on macOS 26 — active appearance, tint rules, nesting rules, clipping rules, and shadow breathing room. Use when glass looks flat/rimless, when a glass panel or tooltip lacks the edge highlight the Dock's tooltips have, when a glass shadow clips at a window or view edge (visible on light backdrops), or when building any NSPanel/overlay/tooltip/toast/card that uses glassEffect or NSGlassEffectView.
---

# Liquid Glass: earning the rim

The specular rim — the bright refracted edge that makes Liquid Glass
read as glass instead of gray fog — is not a property you set. It is
part of glass's ACTIVE rendering treatment, granted or withheld by a
stack of conditions. Every rule below was isolated one variable at a
time on specimen benches during Notate's glass round (2026-07-29),
after seven wrong theories. Follow them and skip the research.

## Rule 1: The window must report an active appearance

Glass renders its flattened, rimless inactive variant unless the
window has an active appearance. Only the key window of the active
app gets that for free. Non-key panels — tooltips, toasts, HUD
pills, any `.nonactivatingPanel` — NEVER have it, and no public API
grants it:

- `canBecomeKey`, `orderFrontRegardless`, `addChildWindow`, level,
  style mask, shadow flags, transparency — all irrelevant. Bench
  eliminated each one.
- SwiftUI `.environment(\.controlActiveState, .key)` fools controls,
  not glass — the decision happens below SwiftUI, in the material
  system.
- Overriding `isKeyWindow` alone is NOT sufficient.

**The fix** is the private AppKit hook the material system consults:

```swift
final class ActiveGlassPanel: NSPanel {
  @objc private func _hasActiveAppearance() -> Bool { true }
}
```

Pin it on the panel (or NSWindow subclass) hosting the glass.
Failure mode is graceful: if a future macOS drops the selector, the
override is never called and glass reverts to rimless — no crash.
`NSGlassEffectView` has no `state` property (unlike
NSVisualEffectView), so there is no public alternative. Also pin it
on always-on overlay windows whose glass must stay active while key
status sits elsewhere (a Settings window, a picker panel): without
it, the material additionally lightens ~2.4x when the app
deactivates.

## Rule 2: SwiftUI .tint() kills the rim; AppKit tintColor does not

- `.glassEffect(.regular.tint(color))` renders a rimless variant at
  any alpha. Plain `.regular` rims at any shape (capsule, rounded
  rect of any radius — shape is never the variable).
- `.glassEffect(.clear.tint(color))` KEEPS the rim through tinting —
  but `.clear` is much brighter/more transparent overall.
- AppKit's `NSGlassEffectView.tintColor` keeps the rim. If a SwiftUI
  surface needs smoke AND rim, either use AppKit glass, or put the
  color as a separate layer BEHIND the glass (a tinted view under an
  untinted glass view — the glass contributes lensing and rim over
  the color). Caveat: `tintColor` is silently ignored on standalone
  panels in some configurations — verify visually.

## Rule 3: Never nest glass inside glass

Glass mounted inside another glass effect's content subtree renders
rimless, even when every other condition is met. A flyout/preview
that belongs "inside" a glass island must be hoisted OUT: attach it
as an overlay AFTER the parent's glassEffect modifier, or give it
its own window.

## Rule 4: Nothing may touch the glass edge

The rim lives exactly on the shape's edge; anything painted or
clipped there destroys it:

- `.clipShape(shape)` AFTER `.glassEffect` shaves the rim off. Clip
  the CONTENT before the glass goes on, never the glass itself. In
  AppKit, never set `masksToBounds` on a container whose layer clips
  at the glass shape — clip an inner content container instead.
- A full-bleed fill layered over the glass
  (`.background(color, in: shape)` at the same shape) paints over
  the rim. Inset such fills ~2pt (`shape.inset(by: 2)`) — though
  note the inset can read as a light ring; prefer Rule 2's
  behind-the-glass layering.

## Rule 5: Give the shadow room to breathe

Glass draws its own soft shadow spread well beyond the layout frame,
wider than any explicit layer shadow you configure. Anything that
clips it produces a visible hard cut — subtle on dark backdrops,
glaring in light mode.

- **Panels are hard canvas edges**: pixels outside a window do not
  exist. Size the panel with generous margin around the glass —
  40pt for a tooltip-sized capsule, up to 100pt for a toast — and
  compensate the frame origin so the visible capsule sits where the
  smaller panel used to (`origin.y = target - margin`, etc.).
  Position math should key off one margin constant.
- **Views clip too**: an outer `masksToBounds` guillotines the
  shadow at the view edge exactly like a tight panel (see Rule 4's
  inner-content-clip fix).
- A panel colliding with the screen edge gets shoved back by the
  window server (constrainFrameRect) — fat margins make this hit
  sooner, so flip/clamp placement: render below the control when the
  top can't fit, clamp horizontally with a small inset.

## Rule 6: Size changes the variant logic

`.regular` glass ≤60pt tall renders the light, backdrop-ADAPTIVE
control treatment (it samples what's behind and re-tints). ≥90pt
tall it becomes a fixed SURFACE that ignores the backdrop and
follows the view's appearance (dark mode → dark card) regardless of
content. The threshold sits between 60 and 90pt of height. Small
controls adapt; big cards don't — framework behavior, not a bug.
The symptom: over a white/light backdrop every small control goes
light while the one big card stays stubbornly dark (good contrast,
wrong adaptivity).

**Restoring adaptivity by hand**: flip the card's color scheme from
the luminance of what it sits over. When the card shows or covers an
image you already hold, a 1x1 draw gets the average for free —
CoreGraphics does the downsample-and-mean in one blit, cheap enough
to run per hover:

```swift
// Average luminance via a 1x1 draw; > 140 of 255 = "light".
static func isLightImage(_ image: CGImage) -> Bool {
    var pixel = [UInt8](repeating: 0, count: 4)
    guard let ctx = CGContext(
        data: &pixel, width: 1, height: 1, bitsPerComponent: 8,
        bytesPerRow: 4, space: CGColorSpaceCreateDeviceRGB(),
        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)
    else { return false }
    ctx.interpolationQuality = .low
    ctx.draw(image, in: CGRect(x: 0, y: 0, width: 1, height: 1))
    let lum = 0.299 * Double(pixel[0]) + 0.587 * Double(pixel[1])
        + 0.114 * Double(pixel[2])
    return lum > 140
}
```

```swift
card.environment(\.colorScheme,
                 isLightImage(thumbnail) ? .light : .dark)
```

Light content gets a light card with dark text; dark content keeps
the dark card. `colorScheme` flips the surface glass because the
surface regime follows the view's appearance (that's Rule 6's whole
point). Note the flip recolors text/materials inside the card too —
that's desired. If content changes rapidly (scrubbing frames),
throttle updates or the card strobes.

## Rule 7: Glass cannot be a z-ordered sibling

A `glassEffect` view does not render in place among its siblings — it
hoists into a shared effect layer. Two consequences, both observed
(Notate export-card pile, 2026-07-30) and both unfixable by
configuration:

- **Z-order is ignored**: a glass card logically at the back of a
  ZStack draws IN FRONT of non-glass siblings. Apple documents this
  for AppKit too ("arbitrary subviews may not have consistent z-order
  behavior" inside NSGlassEffectView).
- **Animated transforms balloon it**: under `scaleEffect` /
  `rotationEffect` / `offset` animation (drags, springs), the effect
  layer re-anchors and grows toward the container bounds.
  `GlassEffectContainer` does NOT fix either — it makes the hoisting
  more aggressive.

The division of labor is architectural: glass is for FLOATING
CONTROLS (tooltips, chips, pills, panels — things that own their
layer). A member of a transformed, z-ordered pile of ordinary views
must be an ordinary view (solid/material fill). If a design calls for
"glass card in a stack," the honest options are a themed solid, a
vibrancy NSVisualEffectView, or restructuring so the glass thing is
its own window.

## Rule 8: masksToBounds subtrees composite a wash over glass

A layer-backed view with `masksToBounds = true` that CONTAINS
content, rendered over a glass sheet, draws a faint material wash
across its full bounds — a rounded "phantom card" nobody painted.
Isolated during Notate's session-panel cover work (2026-08-07):

- The clip forces its subtree into a separate compositing group;
  over glass, that group's backing renders as a visible wash
  spanning the clip's frame. No fill exists anywhere in code — the
  wash IS the compositing.
- **An EMPTY masksToBounds view is clean** — the group only
  materializes with content inside. This is a bench trap: the
  minimal specimen passes while the real view fails. Bench clip
  suspects with representative content, never bare.
- Backdrop-adaptive: invisible over dark, bright over light — it
  comes and goes with what's behind, masquerading as other bugs.
  Chased and acquitted on the way: Tahoe scroll-edge material,
  glass-control shadow pileup, SwiftUI glassEffect hoisting. Live
  scroll views correlated only because the clipped views happened
  to contain them.
- The diagnosis that cracked it: line up sibling views over the
  same sheet — washing vs clean — and diff STRUCTURE, not content.
  The only shared element of the washing views was the clip.

**The fix**: don't clip content-only embedded views. Clips usually
exist for morph/animation reveal; a view that never morphs needs no
clip — gate `wantsLayer`/`masksToBounds` off in the embedded mode.
If a clip is genuinely required over glass, expect the wash and
restructure so the clipped subtree sits over a solid instead of the
sheet.

## Bench before believing

When glass misbehaves, don't theorize — build a specimen bench: a
tiny standalone app (or debug window) rendering the same glass view
under each candidate configuration side by side, one variable per
toggle. Every rule above fell out of exactly that; live-app
debugging found none of them. A window with
`_hasActiveAppearance → true` and a mid-gray and a white backdrop
variant reproduces every condition in this file. Two hard-won
amendments from the Rule 8 hunt: specimens must carry REAL content
(empty suspects can pass while full ones fail), and when the bench
disagrees with a pattern the user spotted in the live app, trust
the live pattern — the bench may be missing the triggering
ingredient.
