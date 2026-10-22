---
name: x-bookmarks-archiver
description: Archive a logged-in user's X/Twitter bookmarks without the X API by driving a Chromium-based browser through a local Chrome DevTools Protocol port, crawling bookmark tweet URLs, downloading images and HLS video media, validating MP4 files, and maintaining a local CSV/JSON archive index. Use when the user wants to export, continue, recover, or validate X bookmarks/media from their browser session.
---

# X Bookmarks Archiver

## Requirements

- Use the user's already logged-in Chromium-based browser session. Helium worked during the original run.
- Require a local CDP port, usually `127.0.0.1:9222`.
- Require `node`, `npm`, `ffmpeg`, and `ffprobe`.
- Do not use X APIs. Drive the rendered web page and capture loaded media URLs from browser/network activity.

Enable Helium CDP:

```bash
osascript -e 'quit app "Helium"'
open -na "Helium" --args --remote-debugging-address=127.0.0.1 --remote-debugging-port=9222
```

Disable it when done by quitting Helium and reopening it normally.

## Workflow

1. Confirm CDP is reachable:

```bash
curl -fsS http://127.0.0.1:9222/json/version
```

2. Crawl bookmarks into a checkpoint manifest:

```bash
node /Users/var/.codex/skills/x-bookmarks-archiver/scripts/crawl-bookmarks.js \
  --out "$HOME/Downloads/x-bookmarks-archive" \
  --batch batch3 \
  --resume-mode all-new \
  --target-new 500 \
  --max-scrolls 900 \
  --scroll-method both
```

3. Download media from the newest crawl manifest:

```bash
node /Users/var/.codex/skills/x-bookmarks-archiver/scripts/download-media.js \
  --out "$HOME/Downloads/x-bookmarks-archive" \
  --max-video-seconds 180 \
  --max-dim 1280
```

4. Rebuild indexes and validate MP4 durations:

```bash
node /Users/var/.codex/skills/x-bookmarks-archiver/scripts/validate-index.js \
  --out "$HOME/Downloads/x-bookmarks-archive" \
  --move-invalid
```

5. Check approved labeler items for higher-resolution captured media:

```bash
# Dry run: writes a manifest of upgrade opportunities but does not modify media.
node /Users/var/.codex/skills/x-bookmarks-archiver/scripts/approved-enhancer.js \
  --out "$HOME/Downloads/x-bookmarks-archive"

# Apply upgrades, keeping backups under manifests/approved-enhancer-backups/.
node /Users/var/.codex/skills/x-bookmarks-archiver/scripts/approved-enhancer.js \
  --out "$HOME/Downloads/x-bookmarks-archive" \
  --apply \
  --validate

# Dry-run every archived video, not just approved labeler items.
node /Users/var/.codex/skills/x-bookmarks-archiver/scripts/approved-enhancer.js \
  --out "$HOME/Downloads/x-bookmarks-archive" \
  --scope all \
  --media video
```

## Operational Notes

- The crawler writes checkpoint JSON after every scroll so interrupted runs can be inspected and continued.
- Continuation uses all existing `bookmarks-crawl*.json` files as a skip set, fast-scrolls through known bookmarks, then records older unseen tweet URLs.
- Choose a resume mode deliberately: `newer-top` for bookmarks added since the last run, `older-backlog` for continuing toward the bottom without spending the batch on new top additions, and `all-new` when either kind of unseen bookmark is acceptable.
- X timelines are virtualized; collect post URLs from rendered `article[data-testid="tweet"]` elements and media URLs from Network events.
- If X changes its DOM, preserve the technique: use the rendered page only to identify tweet URLs and trigger media loads; use CDP Network events to capture media sources; use manifests for state and recovery.
- If X stops lazy-loading with synthetic scrolls, keep the crawler running and send real PageDown key events to the Helium tab so rendered tweets continue changing while CDP snapshots and Network capture stay active.
- Prefer HLS video playlists over direct `.mp4` URLs from X; direct MP4s can be tiny initialization stubs.
- Exception: `video.twimg.com/tweet_video/*.mp4` clips are often real short GIF-style videos. They are acceptable when `ffprobe` confirms positive duration.
- For bulk work, prefer capped video variants (`/pl/avc1/<WxH>/...m3u8`) with `maxDim <= 1280`. These may be video-only/no audio, but avoid multi-GB master-playlist downloads.
- For approved-label curation, use `approved-enhancer.js` to scan `labels.json` decisions and upgrade only approved items. It defaults to dry-run, chooses the highest captured HLS video variant unless `--max-dim` caps it, backs up replaced files, and can re-run `validate-index.js` with `--validate`.
- For broad low-resolution audits, run `approved-enhancer.js --scope all --media video` first as a dry run. Apply only after reviewing the manifest because a full-archive high-res pass can grow disk usage quickly.
- Skip long videos by duration guard unless the user explicitly wants them. Record skipped long videos in the download index for later recovery.
- If a video has no source in the timeline crawl, open the tweet in expanded view and play it to capture more network URLs. Use screenshots only as diagnostics unless screen recording is explicitly needed.

## Output Layout

- `media/<author>_<statusId>/tweet.json` - tweet metadata and extracted text
- `media/<author>_<statusId>/image-N.*` - downloaded images or thumbnails
- `media/<author>_<statusId>/video-N-<mediaId>.mp4` - downloaded playable videos
- `manifests/bookmarks-crawl*.json` - crawl checkpoints
- `manifests/download-*.json` - media download indexes, errors, and skipped video details
- `screens/` - diagnostic screenshots from crawl starts and expanded fallback tweets, not proof that video was captured
- `archive-index.csv` - flattened local browsing index
- `archive-summary.json` - combined counts, validation notes, unresolved videos

Read [references/workflow.md](references/workflow.md) before changing the scripts or handling unusual failures.
