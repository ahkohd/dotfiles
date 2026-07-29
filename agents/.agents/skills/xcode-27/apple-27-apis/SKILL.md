---
name: apple-27-apis
description: >-
  Apple's own documentation for APIs introduced in the Xcode 27 SDKs (macOS 26,
  iOS 26). Consult before writing or reviewing code that touches any of them —
  this supersedes prior training, which predates these APIs. Covers: Liquid Glass
  adoption in AppKit, SwiftUI, UIKit and WidgetKit; Swift 6.2 concurrency
  (nonisolated(nonsending), @concurrent, approachable defaults); InlineArray and
  Span; SwiftUI toolbars, styled text editing, WebKit embedding, AlarmKit;
  Foundation AttributedString; Foundation Models on-device LLM; SwiftData class
  inheritance; StoreKit; AppIntents; Swift Charts 3D; MapKit place descriptors;
  Assistive Access, Visual Intelligence and visionOS widgets.
---

Apple's documentation for what shipped in the Xcode 27 SDKs. Prefer it over
recollection: these APIs are newer than most model training, and the failure mode
is confidently inventing a plausible-but-wrong signature.

Read the relevant reference before writing the code, not after — several of these
replace patterns that still compile and still look correct.

# References

Adopting the new design language:

- `references/AppKit-Implementing-Liquid-Glass-Design.md`: Liquid Glass in AppKit —
  materials, toolbars, sidebars, and how existing chrome is affected.
- `references/SwiftUI-Implementing-Liquid-Glass-Design.md`: the SwiftUI equivalent.
- `references/UIKit-Implementing-Liquid-Glass-Design.md`: the UIKit equivalent.
- `references/WidgetKit-Implementing-Liquid-Glass-Design.md`: widgets specifically.

Language and standard library:

- `references/Swift-Concurrency-Updates.md`: Swift 6.2 concurrency — approachable
  concurrency defaults, `nonisolated(nonsending)`, `@concurrent`, and what changes
  when migrating a codebase held back on Swift 5 language mode.
- `references/Swift-InlineArray-Span.md`: `InlineArray` and `Span` — fixed-size
  stack storage and safe borrowed views over contiguous memory.

SwiftUI:

- `references/SwiftUI-New-Toolbar-Features.md`: toolbar API additions.
- `references/SwiftUI-Styled-Text-Editing.md`: rich text editing with
  `AttributedString` in `TextEditor`.
- `references/SwiftUI-WebKit-Integration.md`: embedding WebKit, `WebView` and
  `WebPage`.
- `references/SwiftUI-AlarmKit-Integration.md`: AlarmKit in a SwiftUI app.

Frameworks:

- `references/Foundation-AttributedString-Updates.md`: `AttributedString` changes,
  including its use as a first-class text-editing model.
- `references/FoundationModels-Using-on-device-LLM-in-your-app.md`: the on-device
  LLM — availability checks, guided generation, tool calling, streaming.
- `references/SwiftData-Class-Inheritance.md`: class inheritance in SwiftData
  models and its query implications.
- `references/StoreKit-Updates.md`: StoreKit changes for purchases and
  subscriptions.
- `references/AppIntents-Updates.md`: AppIntents additions.
- `references/Swift-Charts-3D-Visualization.md`: 3D charts.
- `references/MapKit-GeoToolbox-PlaceDescriptors.md`: place descriptors with MapKit
  and GeoToolbox.

Platform-specific, iOS and visionOS:

- `references/Implementing-Assistive-Access-in-iOS.md`: Assistive Access support.
- `references/Implementing-Visual-Intelligence-in-iOS.md`: Visual Intelligence
  integration.
- `references/Widgets-for-visionOS.md`: visionOS widgets.
