#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { pipeline } = require("stream/promises");
const { Readable } = require("stream");
const { spawnSync } = require("child_process");

const home = process.env.HOME;
const args = parseArgs(process.argv.slice(2));
const outDir = expand(args.out || "$HOME/Downloads/x-bookmarks-archive");
const manifestDir = path.join(outDir, "manifests");
const mediaRoot = path.join(outDir, "media");
const cacheRoot = path.join(outDir, args["cache-dir"] || "video-cache-capped");
const maxDim = Number(args["max-dim"] || 1280);
const maxVideoSeconds = Number(args["max-video-seconds"] || 180);
const manifestPath = args.manifest ? expand(args.manifest) : latestManifest(manifestDir);
if (!manifestPath) throw new Error("No crawl manifest found");

fs.mkdirSync(mediaRoot, { recursive: true });
fs.mkdirSync(cacheRoot, { recursive: true });
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const networkUrls = [...new Set((manifest.networkMedia || []).map((entry) => entry.url))];
const indexPath = path.join(manifestDir, `download-${path.basename(manifestPath, ".json")}-${timestamp()}.json`);
const durationCache = new Map();

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

async function main() {
  const state = {
    createdAt: new Date().toISOString(),
    mode: "capped-video-hls-variant-duration-guard",
    maxDim,
    maxVideoSeconds,
    manifestPath,
    totalTweets: manifest.tweets.length,
    processed: 0,
    imagesOk: 0,
    imagesFailed: 0,
    videosOk: 0,
    videosFailed: 0,
    videosSkipped: 0,
    videosLongSkipped: 0,
    items: [],
  };
  writeState(state);

  for (const tweet of manifest.tweets || []) {
    if (!tweet.statusUrl) continue;
    const statusId = (tweet.statusUrl.match(/status\/(\d+)/) || [])[1] || "unknown";
    const author = (tweet.statusUrl.match(/x\.com\/([^/]+)\//) || [])[1] || "unknown";
    const dir = path.join(mediaRoot, `${author}_${statusId}`);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "tweet.json"), JSON.stringify(tweet, null, 2));
    const item = { statusUrl: tweet.statusUrl, dir, images: [], videos: [] };

    const imageSeen = new Set();
    let imageNo = 0;
    for (const img of tweet.mediaImgs || []) {
      if (!img.src || imageSeen.has(img.src)) continue;
      imageSeen.add(img.src);
      imageNo++;
      const downloadUrl = imageDownloadUrl(img.src);
      const file = path.join(dir, `image-${imageNo}.${extFromUrl(downloadUrl, "jpg")}`);
      try {
        const result = await fetchFile(downloadUrl, file);
        item.images.push({ sourceUrl: img.src, downloadUrl, file, bytes: result.bytes, skipped: result.skipped });
        state.imagesOk++;
      } catch (err) {
        item.images.push({ sourceUrl: img.src, downloadUrl, file, error: err.message });
        state.imagesFailed++;
      }
      await sleep(10);
    }

    const videoSeen = new Set();
    let videoNo = 0;
    for (const video of tweet.videos || []) {
      const id = videoIdFromPoster(video.poster) || videoIdFromUrl(video.currentSrc);
      const key = id || video.poster || video.currentSrc;
      if (!key || videoSeen.has(key)) continue;
      videoSeen.add(key);
      videoNo++;
      const picked = variantFor(id);
      const directTweetVideo = tweetVideoSourceFor(id, video);
      const output = path.join(dir, `video-${videoNo}-${safeFilePart(id || "unknown")}.mp4`);
      if (!picked && directTweetVideo) {
        try {
          const result = await downloadDirectMp4(directTweetVideo, output);
          item.videos.push({ id, source: directTweetVideo, sourceType: "tweet_video_direct", file: output, bytes: result.bytes, duration: result.duration, skipped: result.skipped });
          state.videosOk++;
        } catch (err) {
          item.videos.push({ id, source: directTweetVideo, sourceType: "tweet_video_direct", file: output, error: err.message });
          state.videosFailed++;
        }
        continue;
      }
      if (!id || !picked) {
        item.videos.push({ id, file: output, error: "No capped HLS variant captured for this video", poster: video.poster });
        state.videosSkipped++;
        continue;
      }

      try {
        if (fs.existsSync(output) && fs.statSync(output).size > 10 * 1024) {
          item.videos.push({ id, source: picked.url, sourceType: picked.sourceType, file: output, bytes: fs.statSync(output).size, skippedExisting: true });
          state.videosOk++;
          continue;
        }
        const duration = await estimateDuration(picked.url);
        if (maxVideoSeconds > 0 && duration && duration > maxVideoSeconds) {
          item.videos.push({ id, source: picked.url, sourceType: picked.sourceType, width: picked.w, height: picked.h, file: output, skippedLong: true, estimatedDuration: duration, maxVideoSeconds });
          state.videosLongSkipped++;
          continue;
        }
        const cache = path.join(cacheRoot, `${id}.mp4`);
        if (!(fs.existsSync(cache) && fs.statSync(cache).size > 10 * 1024)) {
          const tmp = path.join(cacheRoot, `${id}.tmp.mp4`);
          if (fs.existsSync(tmp)) fs.rmSync(tmp, { force: true });
          const proc = spawnSync("ffmpeg", [
            "-nostdin", "-y", "-hide_banner", "-loglevel", "error",
            "-user_agent", "Mozilla/5.0",
            "-i", picked.url,
            "-c", "copy",
            "-movflags", "+faststart",
            "-f", "mp4",
            tmp,
          ], { encoding: "utf8", timeout: 300000 });
          if (proc.status !== 0 || !fs.existsSync(tmp) || fs.statSync(tmp).size <= 10 * 1024) {
            throw new Error((proc.stderr || proc.stdout || `ffmpeg status ${proc.status}`).slice(0, 2000));
          }
          fs.renameSync(tmp, cache);
        }
        linkOrCopy(cache, output);
        item.videos.push({ id, source: picked.url, sourceType: picked.sourceType, width: picked.w, height: picked.h, file: output, cache, bytes: fs.statSync(output).size, estimatedDuration: duration });
        state.videosOk++;
      } catch (err) {
        item.videos.push({ id, source: picked.url, sourceType: picked.sourceType, width: picked.w, height: picked.h, file: output, error: err.message });
        state.videosFailed++;
      }
    }

    state.items.push(item);
    state.processed++;
    if (state.processed % 10 === 0 || item.images.length || item.videos.length) {
      console.log(`processed ${state.processed}/${state.totalTweets} imgsOK=${state.imagesOk} imgFail=${state.imagesFailed} vidsOK=${state.videosOk} vidFail=${state.videosFailed} vidSkip=${state.videosSkipped} longSkip=${state.videosLongSkipped}`);
    }
    state.updatedAt = new Date().toISOString();
    writeState(state);
  }

  state.completedAt = new Date().toISOString();
  writeState(state);
  console.log("index", indexPath);
  console.log("summary", {
    tweets: state.processed,
    imagesOk: state.imagesOk,
    imagesFailed: state.imagesFailed,
    videosOk: state.videosOk,
    videosFailed: state.videosFailed,
    videosSkipped: state.videosSkipped,
    videosLongSkipped: state.videosLongSkipped,
  });
}

function variantFor(id) {
  const variants = networkUrls
    .filter((url) => id && url.includes(id) && /\/pl\/avc1\/\d+x\d+\//.test(url) && /\.m3u8(?:\?|$)/.test(url))
    .map((url) => {
      const match = url.match(/\/pl\/avc1\/(\d+)x(\d+)\//);
      const w = match ? Number(match[1]) : 0;
      const h = match ? Number(match[2]) : 0;
      return { url, w, h, area: w * h, maxDim: Math.max(w, h), sourceType: "variant_capped" };
    });
  if (variants.length) {
    const capped = variants.filter((variant) => variant.maxDim <= maxDim).sort((a, b) => b.area - a.area);
    return capped[0] || variants.sort((a, b) => a.area - b.area)[0];
  }
  const master = networkUrls.find((url) => id && url.includes(id) && /\/pl\/[^/]+\.m3u8(?:\?|$)/.test(url));
  return master ? { url: master, sourceType: "master_fallback" } : null;
}

async function estimateDuration(url) {
  if (durationCache.has(url)) return durationCache.get(url);
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const text = await res.text();
    const sum = [...text.matchAll(/#EXTINF:([0-9.]+)/g)].reduce((n, match) => n + Number(match[1]), 0);
    const value = Number.isFinite(sum) && sum > 0 ? sum : null;
    durationCache.set(url, value);
    return value;
  } catch {
    durationCache.set(url, null);
    return null;
  }
}

async function fetchFile(url, file) {
  if (fs.existsSync(file) && fs.statSync(file).size > 0) return { skipped: true, bytes: fs.statSync(file).size };
  const tmp = `${file}.tmp`;
  if (fs.existsSync(tmp)) fs.rmSync(tmp, { force: true });
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(tmp));
  fs.renameSync(tmp, file);
  return { skipped: false, bytes: fs.statSync(file).size };
}

async function downloadDirectMp4(url, file) {
  if (fs.existsSync(file) && fs.statSync(file).size > 1024) {
    const duration = probeDuration(file);
    if (duration && duration > 0) return { skipped: true, bytes: fs.statSync(file).size, duration };
    fs.rmSync(file, { force: true });
  }
  const tmp = `${file}.tmp`;
  if (fs.existsSync(tmp)) fs.rmSync(tmp, { force: true });
  const result = await fetchFile(url, tmp);
  const duration = probeDuration(tmp);
  if (!duration || duration <= 0 || fs.statSync(tmp).size <= 1024) {
    fs.rmSync(tmp, { force: true });
    throw new Error("Direct tweet_video MP4 did not validate with positive duration");
  }
  fs.renameSync(tmp, file);
  return { skipped: result.skipped, bytes: fs.statSync(file).size, duration };
}

function probeDuration(file) {
  const result = spawnSync("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=nk=1:nw=1",
    file,
  ], { encoding: "utf8" });
  if (result.status !== 0) return null;
  const value = Number(result.stdout.trim());
  return Number.isFinite(value) ? value : null;
}

function imageDownloadUrl(raw) {
  const url = new URL(raw);
  if (/^\/media\//.test(url.pathname) && url.searchParams.get("format")) url.searchParams.set("name", "orig");
  return url.toString();
}

function extFromUrl(raw, fallback) {
  const url = new URL(raw);
  if (url.searchParams.get("format")) return url.searchParams.get("format").replace(/[^a-z0-9]/gi, "") || fallback;
  const match = url.pathname.match(/\.([a-z0-9]{2,5})$/i);
  return match ? match[1] : fallback;
}

function videoIdFromPoster(poster) {
  return ((poster || "").match(/(?:amplify_video_thumb|ext_tw_video_thumb)\/(\d+)/) || [])[1] ||
    ((poster || "").match(/tweet_video_thumb\/([^/.?]+)/) || [])[1] ||
    null;
}

function videoIdFromUrl(raw) {
  return ((raw || "").match(/tweet_video\/([^/.?]+)/) || [])[1] ||
    ((raw || "").match(/(?:amplify_video|ext_tw_video)\/(\d+)/) || [])[1] ||
    null;
}

function tweetVideoSourceFor(id, video) {
  const candidates = [
    video.currentSrc,
    video.src,
    ...networkUrls,
  ].filter(Boolean);
  return candidates.find((url) => {
    if (!/video\.twimg\.com\/tweet_video\/[^/?]+\.mp4(?:\?|$)/.test(url)) return false;
    return !id || url.includes(`/tweet_video/${id}.`);
  }) || null;
}

function safeFilePart(value) {
  return String(value).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 120) || "unknown";
}

function latestManifest(dir) {
  if (!fs.existsSync(dir)) return null;
  return fs.readdirSync(dir)
    .filter((file) => /^bookmarks-crawl.*\.json$/.test(file))
    .map((file) => path.join(dir, file))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null;
}

function linkOrCopy(src, dest) {
  if (fs.existsSync(dest) && fs.statSync(dest).size > 10 * 1024) return;
  if (fs.existsSync(dest)) fs.rmSync(dest, { force: true });
  try {
    fs.linkSync(src, dest);
  } catch {
    fs.copyFileSync(src, dest);
  }
}

function writeState(state) {
  fs.writeFileSync(indexPath, JSON.stringify(state, null, 2));
}

function parseArgs(argv) {
  const parsed = {};
  for (let i = 0; i < argv.length; i++) {
    const item = argv[i];
    if (!item.startsWith("--")) continue;
    const key = item.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) parsed[key] = "true";
    else parsed[key] = argv[++i];
  }
  return parsed;
}

function expand(value) {
  return value.replace(/^\$HOME\b/, home).replace(/^~\b/, home);
}

function timestamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
