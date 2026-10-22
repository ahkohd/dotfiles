# X Bookmarks Archiver Workflow Reference

## Strategy

Use the browser as the authenticated client. The workflow avoids the X API and instead:

1. Connects to a local Chromium CDP port.
2. Navigates a page target to `https://x.com/i/bookmarks`.
3. Extracts visible tweet status URLs from rendered tweet articles.
4. Captures media URLs from browser network requests/responses.
5. Scrolls until a target number of unseen bookmarks is collected or a safety cap is reached.
6. Downloads images directly.
7. Downloads videos from HLS playlists, choosing capped variants for bulk speed.
8. Validates MP4 duration with `ffprobe`.

## Durable Technique

The important idea is not the exact selector set. Treat X as an authenticated, rendered media loader and split the job into three signals:

- Identity signal: the visible page tells you which bookmark tweets exist. The most durable identifier is a status URL matching `/status/<id>`, usually found in anchors inside or near a rendered tweet container.
- Media signal: the browser network stream tells you what images and videos the page loaded. Capture CDP `Network.requestWillBeSent` and `Network.responseReceived` events, then associate `pbs.twimg.com` and `video.twimg.com` URLs with the tweet currently being opened or observed.
- State signal: local manifests tell you what has already been archived. Do not depend on a session-only cursor; checkpoint every batch and use prior manifests as the skip set.

If X changes layout, keep those boundaries. Repair discovery first, then media association, then download policy.

## Layout-Change Repair Guide

When `article[data-testid="tweet"]` or other selectors stop working:

1. Start with a selector-free scan for anchors:

```js
[...document.querySelectorAll('a[href*="/status/"]')]
  .map((a) => new URL(a.href, location.href).href)
```

2. Group each status anchor with its nearest stable visual container. Prefer semantic containers (`article`, `role="article"`, accessible labels) before generated classes.
3. Extract author and text opportunistically. These improve the local index, but the status URL and status ID are the required fields.
4. Keep scrolling as a virtualized feed: harvest visible status URLs, checkpoint, scroll, wait for DOM/network idle, harvest again.
5. Do not rewrite the media downloader just because the DOM changed. HLS/image URL handling is independent once the crawl manifest has status URLs and captured media URLs.

Repair the smallest surface possible:

- If tweet URLs are missing, update the DOM extraction function.
- If URLs are collected but media is missing, update the expanded-view playback/capture step.
- If files download but videos are invalid, update HLS selection and validation, not the crawler.
- If batches repeat old bookmarks, update skip-set loading from prior crawl manifests.

## Scrolling And Lazy-Load Stalls

The crawler supports `--scroll-method js`, `--scroll-method wheel`, and `--scroll-method both`. Prefer `both`: JS scroll reliably changes position, while wheel input can help X notice lazy-load boundaries.

If scroll position stops increasing while the visible tweets are still all prior archive entries:

1. Confirm the current crawl has collected `batch=0` before cleanup; remove empty partial manifests so they do not pollute resume state.
2. Rerun with `--scroll-method both --scroll-wait-ms 1600`.
3. If X still stops extending the timeline, keep the crawler running and send real PageDown input to Helium:

```bash
osascript -e 'tell application "Helium" to activate'
for i in {1..100}; do
  osascript -e 'tell application "System Events" to key code 121'
  sleep 0.25
done
```

Stop the PageDown helper once the crawler starts logging `new > 0`; after that, let the crawler advance at its own cadence to avoid jumping past rendered tweets.

## Why Direct MP4 Is Not Enough

X often exposes direct `.mp4` URLs that are only small initialization stubs. A file may parse as MP4 but have zero or unusable duration. Use HLS playlists and validate positive duration.

Exception: `video.twimg.com/tweet_video/*.mp4` URLs are commonly short GIF-style MP4 clips. Download them directly when no HLS source exists, then keep them only if `ffprobe` reports positive duration.

## Batch Continuation

To continue a bookmark archive:

- Load all previous `bookmarks-crawl*.json` files.
- Build a `seen` set from `tweet.statusUrl`.
- Start from the top of bookmarks again.
- Ignore seen URLs while fast-scrolling.
- Once unseen URLs appear, record only those as the new batch.

This is slower than a true cursor, but it is stable without using X APIs.

There are two different resume directions because bookmarks can change at the top while the archive has not reached the bottom yet:

- `--resume-mode newer-top`: collect only bookmarks added above the already archived region. Stop after several viewports of known prior bookmarks. Use this when the user just wants recent additions.
- `--resume-mode older-backlog`: skip unarchived top additions until a known archived bookmark appears, then continue through the known region and record unseen older bookmarks below the previous bottom. Use this when the priority is reaching the bottom of the historical backlog.
- `--resume-mode all-new`: default. Record any unseen bookmark, whether it is a new top addition or older backlog. Use this when either direction is acceptable, or set a large enough `--target-new` to cover both.

Recommended cadence for a still-incomplete archive:

1. Run `newer-top` with a small target to capture recent additions.
2. Run `older-backlog` with a larger target to keep moving toward the bottom.
3. Validate after both runs.

Name batches so their purpose is obvious, for example `newer-2026-06-07` and `older-2026-06-07`.

## Video Download Policy

For bulk UI/UX inspiration archives:

- Prefer HLS variant playlist URLs matching `/pl/avc1/<width>x<height>/`.
- Choose the largest variant with max dimension <= 1280.
- Estimate duration by summing `#EXTINF` values in the chosen playlist.
- Skip long videos by default, usually `> 180` seconds.
- Record skipped long videos with source URL and estimated duration.

For a user-requested exact/full capture:

- Use the master HLS playlist when quality and audio matter.
- Expect much larger files and longer downloads.
- For videos that still cannot be downloaded, open expanded tweet view, start playback, and capture either network URLs or a screen recording.

## Screen Recording Fallback Technique

Screen recording is a last resort for videos that the browser can play but whose media source cannot be recovered cleanly. The durable process is:

1. Open the tweet URL in expanded detail view, not the bookmarks timeline.
2. Set a predictable viewport and wait until the tweet, video controls, and poster/video frame are visible.
3. Start playback and hide transient UI if possible by moving the pointer away or waiting for controls to fade.
4. Record the browser tab or window bounds, not the full desktop, to avoid unrelated content.
5. Stop after the clip loops, ends, or reaches a configured maximum duration.
6. Save the recording beside the tweet metadata and mark it as `screen_recorded` in the manifest so it is not confused with downloaded source media.

The implementation can use the host's available screen capture tool (`screencapture`, QuickTime/ScreenCaptureKit wrappers, OBS CLI, or Playwright/CDP screencast frames). The invariant is the capture setup: expanded tweet, stable viewport, visible playback, local manifest entry.

Prefer network extraction over screen recording whenever possible. Screen recordings preserve the visual design/animation but may lose source quality, audio fidelity, captions, and metadata.

## Media Extraction Heuristics

The media logic should stay mostly independent from X's visual layout:

- Images commonly arrive from `pbs.twimg.com/media/...` and can be downloaded directly after removing display-only query params when needed.
- Videos commonly arrive from `video.twimg.com/.../*.m3u8`; prefer HLS playlists over direct MP4 URLs.
- Short GIF-style clips commonly arrive from `video.twimg.com/tweet_video/*.mp4`; validate and keep these direct MP4s when no HLS playlist exists.
- Master playlists may include audio and high resolutions but can be very large.
- Variant playlists under `/pl/avc1/<width>x<height>/` are useful for bounded bulk archives.
- Estimate HLS duration from `#EXTINF` before downloading so very long talks or podcasts can be skipped or queued separately.
- Validate the output file with `ffprobe`; file size alone is not enough.

If X changes CDN URL shapes, update URL classification by observing a single expanded tweet with DevTools/CDP Network logs, then generalize from the loaded image/video hosts and MIME types.

## Fallback Handling

When a tweet has a video element but no usable media ID or HLS source:

1. Open the tweet URL directly.
2. Wait for the article to render.
3. Start visible videos with muted playback.
4. Click the video center once if needed.
5. Save a screenshot to `screens/`.
6. Save network evidence to the tweet folder.
7. Retry media extraction from the new network URL set.

If still unresolved, record it in `archive-summary.json` rather than silently counting it as done.

Screenshots in `screens/` are diagnostics, not video captures. Verify expanded fallback tweets by checking that the matching `media/<author>_<statusId>/` folder contains a playable MP4 with positive `ffprobe` duration.

## Validation

Run `validate-index.js` after each batch. It:

- Rebuilds `archive-index.csv`.
- Rebuilds `archive-summary.json`.
- Runs `ffprobe` on every MP4.
- Reports zero/unknown duration files.
- Optionally moves invalid MP4s under `manifests/invalid-video-stubs/`.

Do not report MP4 counts as final until positive-duration validation passes.
