#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const home = process.env.HOME;
const args = parseArgs(process.argv.slice(2));
const outDir = expand(args.out || "$HOME/Downloads/x-bookmarks-archive");
const batch = args.batch || `batch-${timestamp()}`;
const port = Number(args.port || 9222);
const host = args.host || "127.0.0.1";
const targetNew = Number(args["target-new"] || 500);
const maxScrolls = Number(args["max-scrolls"] || 800);
const stopNoNewAfterFound = Number(args["stop-no-new-after-found"] || 45);
const stopPriorAfterTop = Number(args["stop-prior-after-top"] || 5);
const scrollMethod = args["scroll-method"] || "both";
const scrollWaitMs = Number(args["scroll-wait-ms"] || 1200);
const skipPrior = args["no-skip-prior"] !== "true";
const resumeMode = args["resume-mode"] || "all-new";
if (!["all-new", "newer-top", "older-backlog"].includes(resumeMode)) {
  throw new Error("--resume-mode must be one of: all-new, newer-top, older-backlog");
}
if (!["wheel", "js", "both"].includes(scrollMethod)) {
  throw new Error("--scroll-method must be one of: wheel, js, both");
}

const manifestDir = path.join(outDir, "manifests");
const screensDir = path.join(outDir, "screens");
fs.mkdirSync(manifestDir, { recursive: true });
fs.mkdirSync(screensDir, { recursive: true });

const CDP = requireCdp(outDir);
const started = new Date();
const checkpoint = path.join(manifestDir, `bookmarks-crawl-${batch}-${timestamp(started)}.json`);

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

async function main() {
  const seen = skipPrior ? loadSeen(manifestDir) : new Set();
  console.log("seen from prior crawls", seen.size);

  const targets = await CDP.List({ host, port });
  const target = targets.find((t) => t.type === "page" && /^https:\/\/x\.com\//.test(t.url)) ||
    targets.find((t) => t.type === "page");
  if (!target) throw new Error(`No page target found on ${host}:${port}`);

  const client = await CDP({ target, host, port });
  const { Page, Runtime, Network, Input } = client;
  const networkMedia = new Map();
  const mediaPattern = /pbs\.twimg\.com\/media|pbs\.twimg\.com\/(?:amplify_video_thumb|ext_tw_video_thumb|tweet_video_thumb)|video\.twimg\.com|\.m3u8|\.mp4|\.m4s|ext_tw_video|amplify_video/i;

  Network.requestWillBeSent(({ request, type }) => {
    const url = request && request.url;
    if (url && mediaPattern.test(url)) networkMedia.set(url, { url, type, from: "request" });
  });
  Network.responseReceived(({ response, type }) => {
    const url = response && response.url;
    if (url && mediaPattern.test(url)) {
      networkMedia.set(url, { url, type, mimeType: response.mimeType, status: response.status, from: "response" });
    }
  });

  await Promise.all([Page.enable(), Runtime.enable(), Network.enable()]);
  console.log("navigate bookmarks");
  await Page.navigate({ url: "https://x.com/i/bookmarks" });
  await sleep(7000);
  await Runtime.evaluate({ expression: "window.scrollTo(0,0); undefined" });
  await sleep(2500);

  const tweets = new Map();
  const stats = [];
  let noNewAfterFound = 0;
  let everFoundNew = false;
  let reachedPriorForNewerTop = false;
  let priorScrollsForNewerTop = 0;
  let reachedKnownArchiveForBacklog = seen.size === 0 || !skipPrior;

  for (let scroll = 0; scroll < maxScrolls; scroll++) {
    const result = await Runtime.evaluate({
      expression: `(${extractTimeline.toString()})()`,
      returnByValue: true,
      awaitPromise: true,
    });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    const snap = result.result.value;

    let newInViewport = 0;
    let priorInViewport = 0;
    let skippedNewerInViewport = 0;
    let skippedAfterPriorInViewport = 0;
    for (const article of snap.articles || []) {
      if (!article.statusUrl) continue;
      if (seen.has(article.statusUrl)) {
        priorInViewport++;
        reachedPriorForNewerTop = true;
        reachedKnownArchiveForBacklog = true;
        continue;
      }
      if (resumeMode === "newer-top" && reachedPriorForNewerTop) {
        skippedAfterPriorInViewport++;
        continue;
      }
      if (resumeMode === "older-backlog" && !reachedKnownArchiveForBacklog) {
        skippedNewerInViewport++;
        continue;
      }
      if (!tweets.has(article.statusUrl)) newInViewport++;
      tweets.set(article.statusUrl, mergeTweet(tweets.get(article.statusUrl), article, scroll, snap.scrollY));
    }

    if (newInViewport > 0) {
      everFoundNew = true;
      noNewAfterFound = 0;
    } else if (everFoundNew) {
      noNewAfterFound++;
    }

    stats.push({
      scroll,
      y: snap.scrollY,
      articles: (snap.articles || []).length,
      priorInViewport,
      newInViewport,
      skippedNewerInViewport,
      skippedAfterPriorInViewport,
      batchTotal: tweets.size,
      networkMedia: networkMedia.size,
      scrollHeight: snap.document.scrollHeight,
    });
    if (resumeMode === "newer-top" && priorInViewport > 0) priorScrollsForNewerTop++;

    if (scroll === 0) {
      const shot = await Page.captureScreenshot({ format: "png", captureBeyondViewport: false });
      fs.writeFileSync(path.join(screensDir, `bookmarks-${batch}-start-${timestamp(started)}.png`), Buffer.from(shot.data, "base64"));
    }

    if (scroll % 20 === 0 || newInViewport > 0) {
      console.log(`scroll ${scroll} y=${snap.scrollY} prior=${priorInViewport} new=${newInViewport} skipTop=${skippedNewerInViewport} skipAfterPrior=${skippedAfterPriorInViewport} batch=${tweets.size} net=${networkMedia.size}`);
    }

    writeManifest(true, null, seen, tweets, networkMedia, stats);
    if (resumeMode === "newer-top" && reachedPriorForNewerTop && priorScrollsForNewerTop >= stopPriorAfterTop) {
      writeManifest(false, "newer_top_reached_prior", seen, tweets, networkMedia, stats);
      console.log("stop newer_top_reached_prior");
      break;
    }
    if (tweets.size >= targetNew) {
      writeManifest(false, "target_new", seen, tweets, networkMedia, stats);
      console.log("stop target_new");
      break;
    }
    if (everFoundNew && noNewAfterFound >= stopNoNewAfterFound) {
      writeManifest(false, "no_new_after_found", seen, tweets, networkMedia, stats);
      console.log("stop no_new_after_found");
      break;
    }

    await scrollPage(Runtime, Input, snap);
    await sleep(scrollWaitMs);
  }

  const final = JSON.parse(fs.readFileSync(checkpoint, "utf8"));
  if (final.partial) writeManifest(false, "max_scrolls", seen, tweets, networkMedia, stats);
  const saved = JSON.parse(fs.readFileSync(checkpoint, "utf8"));
  console.log("checkpoint", checkpoint);
  console.log("summary", { reason: saved.reason, newTweets: saved.count, networkMedia: saved.networkMedia.length, scrolls: saved.stats.length, priorSeen: seen.size });
  await client.close();
}

function writeManifest(partial, reason, seen, tweets, networkMedia, stats) {
  const manifest = {
    createdAt: started.toISOString(),
    updatedAt: new Date().toISOString(),
    partial,
    reason,
    priorSeenCount: seen.size,
    max: { maxScrolls, targetNew, stopNoNewAfterFound, stopPriorAfterTop, scrollMethod, scrollWaitMs },
    resumeMode,
    count: tweets.size,
    tweets: [...tweets.values()],
    networkMedia: [...networkMedia.values()],
    stats,
  };
  fs.writeFileSync(checkpoint, JSON.stringify(manifest, null, 2));
}

async function scrollPage(Runtime, Input, snap) {
  const height = Math.max(600, Math.floor((snap.viewport && snap.viewport.h) || 900));
  const width = Math.max(600, Math.floor((snap.viewport && snap.viewport.w) || 1000));
  const deltaY = Math.floor(height * 0.92);
  if (scrollMethod === "wheel" || scrollMethod === "both") {
    await withTimeout(Input.dispatchMouseEvent({
      type: "mouseWheel",
      x: Math.floor(width / 2),
      y: Math.floor(height * 0.72),
      deltaY,
      deltaX: 0,
    }), 3000).catch(() => {});
  }
  if (scrollMethod === "js" || scrollMethod === "both") {
    await Runtime.evaluate({ expression: "window.scrollBy(0, Math.floor(window.innerHeight * 0.92)); undefined" });
  }
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

function extractTimeline() {
  const clean = (s) => (s || "").replace(/\s+/g, " ").trim();
  const articles = [...document.querySelectorAll('article[data-testid="tweet"]')];
  return {
    href: location.href,
    title: document.title,
    scrollY: window.scrollY,
    viewport: { w: innerWidth, h: innerHeight },
    document: {
      scrollHeight: document.scrollingElement.scrollHeight,
      clientHeight: document.scrollingElement.clientHeight,
    },
    articles: articles.map((article, index) => {
      const statusUrls = [...new Set([...article.querySelectorAll('a[href*="/status/"]')]
        .map((a) => a.href.split("?")[0])
        .filter((href) => /https:\/\/x\.com\/[^/]+\/status\/\d+/.test(href)))];
      const mediaImgs = [...article.querySelectorAll("img[src]")]
        .map((img) => ({
          src: img.currentSrc || img.src,
          alt: img.alt || "",
          w: img.naturalWidth || 0,
          h: img.naturalHeight || 0,
        }))
        .filter((img) => /pbs\.twimg\.com\/media|pbs\.twimg\.com\/(?:tweet_video_thumb|amplify_video_thumb|ext_tw_video_thumb)|video_thumb/i.test(img.src));
      const videos = [...article.querySelectorAll("video")].map((video) => {
        const rect = video.getBoundingClientRect();
        return {
          currentSrc: video.currentSrc || video.src || "",
          poster: video.poster || "",
          duration: Number.isFinite(video.duration) ? video.duration : null,
          paused: video.paused,
          rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
        };
      });
      const rect = article.getBoundingClientRect();
      return {
        index,
        statusUrl: statusUrls[0] || null,
        statusUrls,
        text: clean(article.innerText).slice(0, 1400),
        mediaImgs,
        videos,
        rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
      };
    }),
  };
}

function mergeTweet(existing, next, scroll, y) {
  if (!existing) return { ...next, firstSeen: { scroll, y }, lastSeen: { scroll, y }, seenAt: [{ scroll, y }] };
  existing.lastSeen = { scroll, y };
  existing.seenAt.push({ scroll, y });
  if ((next.text || "").length > (existing.text || "").length) existing.text = next.text;
  existing.statusUrls = [...new Set([...(existing.statusUrls || []), ...(next.statusUrls || [])])];
  existing.mediaImgs = [...new Map([...(existing.mediaImgs || []), ...(next.mediaImgs || [])].map((x) => [x.src, x])).values()];
  existing.videos = [...new Map([...(existing.videos || []), ...(next.videos || [])].map((x) => [x.poster || x.currentSrc, x])).values()];
  return existing;
}

function loadSeen(dir) {
  const seen = new Set();
  if (!fs.existsSync(dir)) return seen;
  for (const file of fs.readdirSync(dir)) {
    if (!/^bookmarks-crawl.*\.json$/.test(file)) continue;
    try {
      const manifest = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
      for (const tweet of manifest.tweets || []) if (tweet.statusUrl) seen.add(tweet.statusUrl);
    } catch {}
  }
  return seen;
}

function requireCdp(out) {
  const localRoot = path.join(out, "tools");
  const mod = path.join(localRoot, "node_modules", "chrome-remote-interface");
  try {
    return require(mod);
  } catch {
    fs.mkdirSync(localRoot, { recursive: true });
    const result = spawnSync("npm", ["install", "--prefix", localRoot, "chrome-remote-interface@0.33.3"], { stdio: "inherit" });
    if (result.status !== 0) throw new Error("Failed to install chrome-remote-interface");
    return require(mod);
  }
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
