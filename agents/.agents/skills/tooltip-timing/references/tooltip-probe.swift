import AppKit
import CoreGraphics

// AppKit tooltip timing, measured: two buttons with tooltips, the pointer
// driven by CGEvents along real paths, the tip found as the Window Server's
// tooltip-layer window. Every wait is async so AppKit's event loop runs.
let app = NSApplication.shared
app.setActivationPolicy(.regular)
let window = NSWindow(contentRect: NSRect(x: 200, y: 300, width: 400, height: 200), styleMask: [.titled], backing: .buffered, defer: false)
let a = NSButton(title: "Alpha", target: nil, action: nil); a.frame = NSRect(x: 40, y: 80, width: 120, height: 40); a.toolTip = "Alpha tip"
let b = NSButton(title: "Beta", target: nil, action: nil); b.frame = NSRect(x: 200, y: 80, width: 120, height: 40); b.toolTip = "Beta tip"
window.contentView!.addSubview(a); window.contentView!.addSubview(b)
window.makeKeyAndOrderFront(nil)
app.activate(ignoringOtherApps: true)
let screenH = NSScreen.screens[0].frame.height
func center(_ v: NSView) -> CGPoint {
    let r = v.window!.convertToScreen(v.convert(v.bounds, to: nil))
    return CGPoint(x: r.midX, y: screenH - r.midY)
}
let source = CGEventSource(stateID: .hidSystemState)
var cursor = CGPoint(x: 900, y: 700)
func post(_ p: CGPoint, _ type: CGEventType = .mouseMoved) {
    let e = CGEvent(mouseEventSource: source, mouseType: type, mouseCursorPosition: p, mouseButton: .left)!
    e.setIntegerValueField(.mouseEventDeltaX, value: Int64(p.x - cursor.x))
    e.setIntegerValueField(.mouseEventDeltaY, value: Int64(p.y - cursor.y))
    e.post(tap: .cghidEventTap); cursor = p
}
func sleep(_ s: Double) async { try? await Task.sleep(nanoseconds: UInt64(s * 1e9)) }
@MainActor func move(_ p: CGPoint) async {
    let from = cursor, steps = max(1, Int(hypot(p.x - from.x, p.y - from.y) / 12))
    for i in 1...steps { let f = Double(i) / Double(steps); post(CGPoint(x: from.x + (p.x - from.x) * f, y: from.y + (p.y - from.y) * f)); await sleep(0.006) }
}
func tipShown() -> Bool {
    let list = CGWindowListCopyWindowInfo([.optionOnScreenOnly], kCGNullWindowID) as? [[String: Any]] ?? []
    return list.contains { ($0[kCGWindowLayer as String] as? Int ?? 0) == 2147483630 || (($0[kCGWindowOwnerName as String] as? String) == "probe" && ($0[kCGWindowNumber as String] as? Int) != window.windowNumber) }
}
@MainActor func waitTip(_ limit: Double, during: (() async -> Void)? = nil) async -> Double? {
    let t0 = Date()
    while Date().timeIntervalSince(t0) < limit {
        if tipShown() { return Date().timeIntervalSince(t0) }
        if let during { await during() } else { await sleep(0.01) }
    }
    return nil
}
func fmt(_ v: Double?) -> String { v.map { String(format: "%.0f ms", $0 * 1000) } ?? "never" }
let away = CGPoint(x: 900, y: 700)
Task { @MainActor in
    await sleep(1.5)
    let pa = center(a), pb = center(b)
    func reset() async { await move(away); await sleep(2.5) }
    await reset()
    for i in 1...3 { await move(pa); print("1. rest on Alpha, run \(i): \(fmt(await waitTip(6)))"); await reset() }
    await move(pa)
    var x = 0.0
    print("2. moving inside Alpha, 1 pt per 30 ms for 6 s: \(fmt(await waitTip(6) { x += 1; post(CGPoint(x: pa.x - 40 + x.truncatingRemainder(dividingBy: 80), y: pa.y)); await sleep(0.03) }))")
    await reset()
    await move(pa); x = 0
    _ = await waitTip(1.5) { x += 1; post(CGPoint(x: pa.x - 40 + x.truncatingRemainder(dividingBy: 80), y: pa.y)); await sleep(0.03) }
    print("3. 1.5 s moving inside, then resting: \(fmt(await waitTip(6)))")
    await reset()
    await move(pa); _ = await waitTip(6); await move(pb)
    print("4. warm: Alpha's tip up, glide to Beta: \(fmt(await waitTip(6)))")
    await reset()
    for gap in [0.3, 0.6, 1.0, 2.0] {
        await move(pa); _ = await waitTip(6); await move(away); await sleep(gap); await move(pb)
        print("5. Beta after \(gap) s away from a shown tip: \(fmt(await waitTip(6)))")
        await reset()
    }
    await move(pa); _ = await waitTip(6); post(pa, .leftMouseDown); post(pa, .leftMouseUp); await sleep(0.15)
    print("6. after a click, tip still shown: \(tipShown())")
    print("6. after a click, resting on: \(fmt(await waitTip(6)))")
    await reset()
    await move(pa); _ = await waitTip(6)
    let kd = CGEvent(keyboardEventSource: source, virtualKey: 0x38, keyDown: true)!; kd.post(tap: .cghidEventTap)
    CGEvent(keyboardEventSource: source, virtualKey: 0x38, keyDown: false)!.post(tap: .cghidEventTap)
    await sleep(0.15)
    print("7. after a key press (shift), tip still shown: \(tipShown())")
    await reset()
    NSWorkspace.shared.launchApplication("Finder"); await sleep(1.5)
    await move(pa)
    print("8. app inactive, rest on Alpha: \(fmt(await waitTip(6)))")
    await move(pa); await sleep(4)
    print("9. tip still up after 10 s resting: \(tipShown())")
    print("done")
    exit(0)
}
app.run()
