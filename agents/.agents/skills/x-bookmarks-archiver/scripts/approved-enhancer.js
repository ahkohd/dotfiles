#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { Readable } = require("stream");
const { pipeline } = require("stream/promises");
const { spawnSync } = require("child_process");

const home = process.env.HOME;
const args = parseArgs(process.argv.slice(2));
const outDir = expand(args.out || "$HOME/Downloads/x-bookmarks-archive");
const mediaRoot = path.join(outDir, "media");
const manifestDir = path.join(outDir, "manifests");
const labelsPath = expand(args.labels || path.join(outDir, "labels.json"));
const apply = args.apply === "true";
const validate = args.validate === "true";
const scope = args.scope || "approved";
const mediaMode = args.media || "all";
const maxDim = Number(args["max-dim"] || 0);
const maxVideoSeconds = Number(args["max-video-seconds"] || 180);
const minAreaGain = Number(args["min-area-gain"] || 1.05);
const limit = args.limit ? Number(args.limit) : 0;
const statusFilter = new Set([].concat(args.status || []).filter(Boolean));
const ffmpegBin = args.ffmpeg || "ffmpeg";
const ffprobeBin = args.ffprobe || "ffprobe";
const ffmpegTimeoutMs = Number(args["ffmpeg-timeout-ms"] || 900000);
const runId = timestamp();
const manifestPath = path.join(manifestDir, `approved-enhancer-${runId}.json`);
const backupRoot = path.join(manifestDir, "approved-enhancer-backups", runId);

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

async function main() {
  if (!["all", "video", "image"].includes(mediaMode)) {
    throw new Error("--media must be one of: all, video, image");
  }
  if (!["approved", "all"].includes(scope)) {
    throw new Error("--scope must be one of: approved, all");
  }
  fs.mkdirSync(manifestDir, { recursive: true });
  const indexRows = loadArchiveIndex(path.join(outDir, "archive-index.csv"));
  const labels = scope === "approved" ? readJson(labelsPath, { items: {} }) : { items: {} };
  const approved = scope === "approved"
    ? Object.values(labels.items || {})
      .filter((label) => label && label.decision === "approve")
      .filter((label) => !statusFilter.size || statusFilter.has(label.statusUrl))
      .slice(0, limit > 0 ? limit : undefined)
    : [];
  const targets = scope === "approved"
    ? approved.map((label) => targetFromLabel(label, indexRows)).filter(Boolean)
    : targetsFromArchiveIndex(indexRows)
      .filter((target) => !statusFilter.size || statusFilter.has(target.statusUrl))
      .slice(0, limit > 0 ? limit : undefined);
  const targetVideoIds = new Set();
  for (const target of targets) {
    const tweet = readJson(path.join(target.dir, "tweet.json"), {});
    target.tweet = tweet;
    for (const video of videosForTarget(target, tweet)) {
      if (video.id) targetVideoIds.add(video.id);
    }
  }

  const capturedUrlsById = mediaMode === "image" ? new Map() : loadCapturedUrls(targetVideoIds);
  const state = {
    version: 1,
    createdAt: new Date().toISOString(),
    mode: apply ? "apply" : "dry-run",
    scope,
    outDir,
    labelsPath,
    approvedCount: approved.length,
    targetCount: targets.length,
    mediaMode,
    maxDim,
    maxVideoSeconds,
    minAreaGain,
    backupRoot: apply ? backupRoot : null,
    summary: {
      itemsScanned: 0,
      videosChecked: 0,
      videosUpgradeable: 0,
      videosUpgraded: 0,
      videosSkipped: 0,
      videoErrors: 0,
      imagesChecked: 0,
      imageCandidates: 0,
      imagesUpgraded: 0,
      imagesSkipped: 0,
      imageErrors: 0,
    },
    items: [],
  };
  writeJson(manifestPath, state);

  for (const target of targets) {
    const item = await enhanceTarget(target, capturedUrlsById, state.summary);
    state.items.push(item);
    state.summary.itemsScanned++;
    state.updatedAt = new Date().toISOString();
    writeJson(manifestPath, state);
    console.log(progressLine(state.summary, item));
  }

  if (apply && validate) {
    state.validation = runValidateIndex();
    state.updatedAt = new Date().toISOString();
    writeJson(manifestPath, state);
  }

  state.completedAt = new Date().toISOString();
  writeJson(manifestPath, state);
  console.log(JSON.stringify({ manifestPath, summary: state.summary, validation: state.validation || null }, null, 2));
}

async function enhanceTarget(target, capturedUrlsById, summary) {
  const item = {
    statusUrl: target.statusUrl,
    folderName: path.basename(target.dir),
    folder: target.dir,
    label: target.label,
    videos: [],
    images: [],
  };
  const tweet = target.tweet || readJson(path.join(target.dir, "tweet.json"), {});

  if (mediaMode === "all" || mediaMode === "video") {
    for (const video of videosForTarget(target, tweet)) {
      summary.videosChecked++;
      const result = await inspectVideo(target, video, capturedUrlsById.get(video.id) || []);
      item.videos.push(result);
      if (result.action === "upgrade_available") summary.videosUpgradeable++;
      else if (result.action === "upgraded") summary.videosUpgraded++;
      else if (result.action === "error") summary.videoErrors++;
      else summary.videosSkipped++;
    }
  }

  if (mediaMode === "all" || mediaMode === "image") {
    for (const image of imagesForTarget(target, tweet)) {
      summary.imagesChecked++;
      const result = await inspectImage(target, image);
      item.images.push(result);
      if (result.action === "candidate_available") summary.imageCandidates++;
      else if (result.action === "upgraded") summary.imagesUpgraded++;
      else if (result.action === "error") summary.imageErrors++;
      else summary.imagesSkipped++;
    }
  }

  return item;
}

async function inspectVideo(target, video, capturedUrls) {
  const current = probeVideo(video.file);
  const result = {
    id: video.id,
    file: video.file,
    current,
    capturedUrlCount: capturedUrls.length,
    action: "skipped",
    reason: "",
  };
  if (!video.id) {
    result.reason = "No media id found for local video file.";
    return result;
  }
  if (!fs.existsSync(video.file)) {
    result.action = "error";
    result.error = "Local video file is missing.";
    return result;
  }
  const candidate = await bestVideoCandidate(video.id, capturedUrls);
  result.candidate = candidate ? publicCandidate(candidate) : null;
  if (!candidate) {
    result.reason = "No HLS video variant was captured for this media id.";
    return result;
  }
  if (maxVideoSeconds > 0 && candidate.duration && candidate.duration > maxVideoSeconds) {
    result.reason = `Candidate duration ${candidate.duration.toFixed(3)}s exceeds --max-video-seconds ${maxVideoSeconds}.`;
    return result;
  }
  if (!shouldReplaceByArea(current, candidate, minAreaGain)) {
    result.reason = "Current video is already at least as large as the best captured candidate.";
    return result;
  }
  if (!apply) {
    result.action = "upgrade_available";
    result.reason = "Dry run only. Re-run with --apply to replace the local file.";
    return result;
  }

  const tmp = `${video.file}.approved-enhancer.tmp.mp4`;
  try {
    downloadHls(candidate.url, tmp);
    const downloaded = probeVideo(tmp);
    if (!downloaded || !(downloaded.duration > 0)) throw new Error("Downloaded MP4 did not validate with positive duration.");
    if (!shouldReplaceByArea(current, downloaded, minAreaGain)) {
      fs.rmSync(tmp, { force: true });
      result.reason = "Downloaded candidate was not larger after probing.";
      return result;
    }
    const backup = backupFile(video.file, target.dir);
    fs.renameSync(tmp, video.file);
    result.action = "upgraded";
    result.backup = backup;
    result.after = probeVideo(video.file);
    return result;
  } catch (err) {
    fs.rmSync(tmp, { force: true });
    result.action = "error";
    result.error = err.message;
    return result;
  }
}

async function inspectImage(target, image) {
  const current = probeImage(image.file);
  const source = image.sourceUrl || "";
  const candidateUrl = imageOriginalUrl(source);
  const result = {
    file: image.file,
    sourceUrl: source,
    candidateUrl,
    current,
    action: "skipped",
    reason: "",
  };
  if (!source) {
    result.reason = "No source URL recorded in tweet.json for this image.";
    return result;
  }
  if (!candidateUrl || candidateUrl === source) {
    result.reason = "No higher-resolution image URL pattern is known for this source.";
    return result;
  }
  if (!fs.existsSync(image.file)) {
    result.action = "error";
    result.error = "Local image file is missing.";
    return result;
  }
  if (!apply) {
    result.action = "candidate_available";
    result.reason = "Dry run only. Re-run with --apply to download, probe, compare, and replace if larger.";
    return result;
  }

  const tmp = `${image.file}.approved-enhancer.tmp`;
  try {
    await fetchFile(candidateUrl, tmp);
    const downloaded = probeImage(tmp);
    if (!downloaded || !shouldReplaceByArea(current, downloaded, minAreaGain)) {
      fs.rmSync(tmp, { force: true });
      result.reason = "Downloaded image was not larger after probing.";
      result.downloaded = downloaded;
      return result;
    }
    const backup = backupFile(image.file, target.dir);
    fs.renameSync(tmp, image.file);
    result.action = "upgraded";
    result.backup = backup;
    result.after = probeImage(image.file);
    return result;
  } catch (err) {
    fs.rmSync(tmp, { force: true });
    result.action = "error";
    result.error = err.message;
    return result;
  }
}

async function bestVideoCandidate(id, urls) {
  const candidates = [];
  for (const url of urls) {
    const variant = variantFromUrl(url);
    if (variant) candidates.push(variant);
  }
  for (const masterUrl of urls.filter((url) => isMasterPlaylist(url))) {
    const variants = await variantsFromMaster(masterUrl);
    candidates.push(...variants);
  }
  const deduped = [...new Map(candidates.map((candidate) => [candidate.url, candidate])).values()]
    .filter((candidate) => candidate.id === id || candidate.url.includes(id))
    .filter((candidate) => maxDim <= 0 || Math.max(candidate.width, candidate.height) <= maxDim)
    .sort((a, b) => (b.area - a.area) || ((b.bandwidth || 0) - (a.bandwidth || 0)));
  if (!deduped.length) return null;
  const best = deduped[0];
  best.duration = await estimateDuration(best.url);
  return best;
}

async function variantsFromMaster(masterUrl) {
  try {
    const text = await fetchText(masterUrl);
    const lines = text.split(/\r?\n/);
    const variants = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line.startsWith("#EXT-X-STREAM-INF:")) continue;
      const next = (lines[i + 1] || "").trim();
      if (!next || next.startsWith("#")) continue;
      const res = line.match(/RESOLUTION=(\d+)x(\d+)/);
      if (!res) continue;
      const bandwidth = Number(line.match(/(?:AVERAGE-)?BANDWIDTH=(\d+)/)?.[1] || 0);
      const url = new URL(next, masterUrl).toString();
      const id = videoIdFromUrl(url) || videoIdFromUrl(masterUrl);
      const width = Number(res[1]);
      const height = Number(res[2]);
      variants.push({ id, url, width, height, area: width * height, bandwidth, sourceType: "master_variant", masterUrl });
    }
    return variants;
  } catch {
    return [];
  }
}

function variantFromUrl(url) {
  if (!/\.m3u8(?:\?|$)/.test(url)) return null;
  const match = url.match(/\/pl\/avc1\/(\d+)x(\d+)\//);
  if (!match) return null;
  const width = Number(match[1]);
  const height = Number(match[2]);
  return {
    id: videoIdFromUrl(url),
    url,
    width,
    height,
    area: width * height,
    bandwidth: 0,
    sourceType: "captured_variant",
  };
}

function isMasterPlaylist(url) {
  return /\.m3u8(?:\?|$)/.test(url) && /\/(?:pu\/)?pl\/[^/]+\.m3u8(?:\?|$)/.test(url) && !/\/pl\/avc1\/\d+x\d+\//.test(url);
}

async function estimateDuration(url) {
  try {
    const text = await fetchText(url);
    const total = [...text.matchAll(/#EXTINF:([0-9.]+)/g)].reduce((sum, match) => sum + Number(match[1]), 0);
    return Number.isFinite(total) && total > 0 ? total : null;
  } catch {
    return null;
  }
}

function downloadHls(url, file) {
  fs.rmSync(file, { force: true });
  const proc = spawnSync(ffmpegBin, [
    "-nostdin", "-y", "-hide_banner", "-loglevel", "error",
    "-user_agent", "Mozilla/5.0",
    "-i", url,
    "-map", "0:v:0",
    "-map", "0:a?",
    "-c", "copy",
    "-movflags", "+faststart",
    "-f", "mp4",
    file,
  ], { encoding: "utf8", timeout: ffmpegTimeoutMs });
  if (proc.status !== 0 || !fs.existsSync(file) || fs.statSync(file).size <= 10 * 1024) {
    throw new Error((proc.stderr || proc.stdout || `ffmpeg status ${proc.status}`).slice(0, 2000));
  }
}

async function fetchFile(url, file) {
  fs.rmSync(file, { force: true });
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(file));
  if (!fs.existsSync(file) || fs.statSync(file).size <= 0) throw new Error("Downloaded file was empty.");
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.text();
}

function videosForTarget(target, tweet) {
  const files = fs.existsSync(target.dir)
    ? fs.readdirSync(target.dir).filter((file) => /^video-\d+-.+\.mp4$/i.test(file)).sort(sortMediaFiles)
    : [];
  const tweetIds = [];
  const seen = new Set();
  for (const video of tweet.videos || []) {
    const id = videoIdFromPoster(video.poster) || videoIdFromUrl(video.currentSrc) || videoIdFromUrl(video.src);
    if (id && !seen.has(id)) {
      seen.add(id);
      tweetIds.push(id);
    }
  }
  return files.map((file, index) => {
    const idFromFile = mediaIdFromVideoFile(file);
    return {
      file: path.join(target.dir, file),
      fileName: file,
      id: idFromFile !== "unknown" ? idFromFile : tweetIds[index] || idFromFile,
    };
  });
}

function imagesForTarget(target, tweet) {
  const files = fs.existsSync(target.dir)
    ? fs.readdirSync(target.dir).filter((file) => /^image-\d+\.(jpe?g|png|gif|webp)$/i.test(file)).sort(sortMediaFiles)
    : [];
  const sources = [];
  const seen = new Set();
  for (const img of tweet.mediaImgs || []) {
    if (!img.src || seen.has(img.src)) continue;
    seen.add(img.src);
    sources.push(img.src);
  }
  return files.map((file, index) => ({
    file: path.join(target.dir, file),
    fileName: file,
    sourceUrl: sources[index] || "",
  }));
}

function loadCapturedUrls(targetIds) {
  const byId = new Map([...targetIds].map((id) => [id, new Set()]));
  if (!fs.existsSync(manifestDir) || !targetIds.size) return byId;
  const files = fs.readdirSync(manifestDir)
    .filter((file) => /^(bookmarks-crawl|download-).*\.json$/.test(file))
    .map((file) => path.join(manifestDir, file));
  const urlRe = /https:\/\/(?:video|pbs)\.twimg\.com\/[^"'\s]+/g;
  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    const matches = text.match(urlRe) || [];
    for (const raw of matches) {
      const url = cleanCapturedUrl(raw);
      const id = videoIdFromUrl(url);
      if (id && byId.has(id)) byId.get(id).add(url);
    }
  }
  return new Map([...byId.entries()].map(([id, urls]) => [id, [...urls]]));
}

function cleanCapturedUrl(raw) {
  return raw
    .replace(/\\u0026/g, "&")
    .replace(/\\\//g, "/")
    .replace(/[),\]]+$/g, "");
}

function targetFromLabel(label, indexRows) {
  const indexed = indexRows.get(label.statusUrl);
  const folderName = label.folderName || folderNameFromStatus(label.statusUrl);
  const dir = indexed?.folder || path.join(mediaRoot, folderName);
  if (!dir || !fs.existsSync(dir)) {
    return {
      statusUrl: label.statusUrl,
      dir,
      label,
      missing: true,
    };
  }
  return { statusUrl: label.statusUrl, dir, label };
}

function targetsFromArchiveIndex(indexRows) {
  return [...indexRows.values()]
    .filter((row) => row.statusUrl)
    .map((row) => {
      const dir = row.folder || path.join(mediaRoot, folderNameFromStatus(row.statusUrl));
      return { statusUrl: row.statusUrl, dir, label: null };
    })
    .filter((target) => fs.existsSync(target.dir));
}

function probeVideo(file) {
  const json = ffprobeJson(file, [
    "-v", "error",
    "-select_streams", "v:0",
    "-show_entries", "stream=width,height,codec_name,bit_rate",
    "-show_entries", "format=duration,size,bit_rate",
    "-of", "json",
  ]);
  if (!json) return null;
  const stream = (json.streams || [])[0] || {};
  const format = json.format || {};
  return {
    codec: stream.codec_name || "",
    width: Number(stream.width || 0),
    height: Number(stream.height || 0),
    area: Number(stream.width || 0) * Number(stream.height || 0),
    duration: Number(format.duration || 0),
    size: Number(format.size || safeSize(file)),
    bitRate: Number(format.bit_rate || stream.bit_rate || 0),
  };
}

function probeImage(file) {
  const json = ffprobeJson(file, [
    "-v", "error",
    "-select_streams", "v:0",
    "-show_entries", "stream=width,height,codec_name",
    "-of", "json",
  ]);
  if (!json) return null;
  const stream = (json.streams || [])[0] || {};
  return {
    codec: stream.codec_name || "",
    width: Number(stream.width || 0),
    height: Number(stream.height || 0),
    area: Number(stream.width || 0) * Number(stream.height || 0),
    size: safeSize(file),
  };
}

function ffprobeJson(file, probeArgs) {
  if (!fs.existsSync(file)) return null;
  const proc = spawnSync(ffprobeBin, [...probeArgs, file], { encoding: "utf8" });
  if (proc.status !== 0) return null;
  try {
    return JSON.parse(proc.stdout);
  } catch {
    return null;
  }
}

function shouldReplaceByArea(current, candidate, gain) {
  if (!candidate || !(candidate.width > 0) || !(candidate.height > 0)) return false;
  if (!current || !(current.width > 0) || !(current.height > 0)) return true;
  return candidate.width * candidate.height >= current.width * current.height * gain;
}

function backupFile(file, targetDir) {
  fs.mkdirSync(backupRoot, { recursive: true });
  const folder = path.basename(targetDir);
  const dest = uniquePath(path.join(backupRoot, `${folder}-${path.basename(file)}`));
  fs.copyFileSync(file, dest);
  return dest;
}

function runValidateIndex() {
  const script = path.join(__dirname, "validate-index.js");
  const proc = spawnSync(process.execPath, [script, "--out", outDir, "--move-invalid"], { encoding: "utf8", timeout: 600000 });
  let parsed = null;
  try {
    parsed = JSON.parse(proc.stdout);
  } catch {}
  return {
    status: proc.status,
    ok: proc.status === 0,
    summary: parsed,
    stderr: proc.stderr ? proc.stderr.slice(0, 4000) : "",
  };
}

function publicCandidate(candidate) {
  return {
    sourceType: candidate.sourceType,
    url: candidate.url,
    width: candidate.width,
    height: candidate.height,
    duration: candidate.duration || null,
    bandwidth: candidate.bandwidth || 0,
    masterUrl: candidate.masterUrl || null,
  };
}

function imageOriginalUrl(raw) {
  if (!raw) return "";
  try {
    const url = new URL(raw);
    if (url.hostname !== "pbs.twimg.com") return "";
    if (url.pathname.startsWith("/media/")) {
      if (url.searchParams.has("format")) url.searchParams.set("name", "orig");
      else if (url.searchParams.has("name")) url.searchParams.set("name", "orig");
      else return "";
      return url.toString();
    }
    if (url.searchParams.has("name") && url.searchParams.get("name") !== "orig") {
      url.searchParams.set("name", "orig");
      return url.toString();
    }
    return "";
  } catch {
    return "";
  }
}

function mediaIdFromVideoFile(file) {
  return file.match(/^video-\d+-(.+)\.mp4$/i)?.[1] || "";
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

function loadArchiveIndex(file) {
  const rows = new Map();
  if (!fs.existsSync(file)) return rows;
  for (const row of parseCsv(fs.readFileSync(file, "utf8"))) {
    if (row.statusUrl) rows.set(row.statusUrl, row);
  }
  return rows;
}

function parseCsv(text) {
  const rows = [];
  const parsed = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];
    if (quoted) {
      if (char === "\"" && next === "\"") {
        field += "\"";
        i++;
      } else if (char === "\"") {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === "\"") {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      parsed.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }
  if (field || row.length) {
    row.push(field);
    parsed.push(row);
  }
  const headers = parsed.shift() || [];
  for (const values of parsed) {
    const item = {};
    headers.forEach((header, index) => {
      item[header] = values[index] || "";
    });
    rows.push(item);
  }
  return rows;
}

function sortMediaFiles(a, b) {
  return mediaNo(a) - mediaNo(b) || a.localeCompare(b);
}

function mediaNo(file) {
  return Number(file.match(/-(\d+)[-.]/)?.[1] || 0);
}

function folderNameFromStatus(statusUrl) {
  const author = statusUrl.match(/x\.com\/([^/]+)\//)?.[1] || "unknown";
  const statusId = statusUrl.match(/status\/(\d+)/)?.[1] || "unknown";
  return `${author}_${statusId}`;
}

function safeSize(file) {
  try {
    return fs.statSync(file).size;
  } catch {
    return 0;
  }
}

function uniquePath(file) {
  if (!fs.existsSync(file)) return file;
  const ext = path.extname(file);
  const base = file.slice(0, -ext.length);
  let i = 2;
  while (fs.existsSync(`${base}-${i}${ext}`)) i++;
  return `${base}-${i}${ext}`;
}

function progressLine(summary, item) {
  const local = [
    `scanned=${summary.itemsScanned}`,
    `vidUp=${summary.videosUpgraded}`,
    `vidAvail=${summary.videosUpgradeable}`,
    `imgUp=${summary.imagesUpgraded}`,
    `imgAvail=${summary.imageCandidates}`,
  ].join(" ");
  return `${local} ${item.statusUrl}`;
}

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function parseArgs(argv) {
  const parsed = {};
  for (let i = 0; i < argv.length; i++) {
    const item = argv[i];
    if (!item.startsWith("--")) continue;
    const key = item.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = "true";
    } else if (parsed[key]) {
      parsed[key] = [].concat(parsed[key], argv[++i]);
    } else {
      parsed[key] = argv[++i];
    }
  }
  return parsed;
}

function expand(value) {
  return String(value).replace(/^\$HOME\b/, home).replace(/^~\b/, home);
}

function timestamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}
