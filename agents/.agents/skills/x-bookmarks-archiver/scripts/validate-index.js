#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const home = process.env.HOME;
const args = parseArgs(process.argv.slice(2));
const outDir = expand(args.out || "$HOME/Downloads/x-bookmarks-archive");
const moveInvalid = args["move-invalid"] === "true";
const allDownloadIndexes = args["all-download-indexes"] === "true";
const mediaRoot = path.join(outDir, "media");
const manifestDir = path.join(outDir, "manifests");
fs.mkdirSync(manifestDir, { recursive: true });

const dirs = fs.existsSync(mediaRoot)
  ? fs.readdirSync(mediaRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => path.join(mediaRoot, entry.name)).sort()
  : [];

const rows = [];
const invalidVideos = [];
for (const dir of dirs) {
  let tweet = {};
  try {
    tweet = JSON.parse(fs.readFileSync(path.join(dir, "tweet.json"), "utf8"));
  } catch {}
  const files = fs.readdirSync(dir);
  const images = files.filter((file) => /\.(jpe?g|png|webp)$/i.test(file));
  const videos = files.filter((file) => /\.mp4$/i.test(file));
  for (const video of videos) {
    const file = path.join(dir, video);
    const duration = ffprobeDuration(file);
    if (!(duration > 0)) invalidVideos.push({ file, duration });
  }
  const bytes = files.reduce((total, file) => {
    try {
      return total + fs.statSync(path.join(dir, file)).size;
    } catch {
      return total;
    }
  }, 0);
  rows.push({
    statusUrl: tweet.statusUrl || "",
    folder: dir,
    images: images.length,
    videos: videos.length,
    bytes,
    text: (tweet.text || "").slice(0, 250),
  });
}

if (moveInvalid && invalidVideos.length) {
  const invalidDir = path.join(manifestDir, "invalid-video-stubs");
  fs.mkdirSync(invalidDir, { recursive: true });
  for (const item of invalidVideos) {
    const dest = uniquePath(path.join(invalidDir, `${path.basename(path.dirname(item.file))}-${path.basename(item.file)}.stub`));
    fs.renameSync(item.file, dest);
    item.movedTo = dest;
  }
}

const refreshedRows = moveInvalid && invalidVideos.length ? rebuildRows(mediaRoot) : rows;
writeCsv(path.join(outDir, "archive-index.csv"), refreshedRows);
const summary = buildSummary(outDir, refreshedRows, invalidVideos);
fs.writeFileSync(path.join(outDir, "archive-summary.json"), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));

function rebuildRows(root) {
  return fs.readdirSync(root, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => {
    const dir = path.join(root, entry.name);
    let tweet = {};
    try {
      tweet = JSON.parse(fs.readFileSync(path.join(dir, "tweet.json"), "utf8"));
    } catch {}
    const files = fs.readdirSync(dir);
    const images = files.filter((file) => /\.(jpe?g|png|webp)$/i.test(file));
    const videos = files.filter((file) => /\.mp4$/i.test(file));
    const bytes = files.reduce((total, file) => {
      try {
        return total + fs.statSync(path.join(dir, file)).size;
      } catch {
        return total;
      }
    }, 0);
    return { statusUrl: tweet.statusUrl || "", folder: dir, images: images.length, videos: videos.length, bytes, text: (tweet.text || "").slice(0, 250) };
  }).sort((a, b) => a.folder.localeCompare(b.folder));
}

function buildSummary(root, currentRows, invalid) {
  let downloadIndexes = fs.readdirSync(manifestDir)
    .filter((file) => /^download-.*\.json$/.test(file))
    .map((file) => path.join(manifestDir, file))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  if (!allDownloadIndexes) downloadIndexes = downloadIndexes.slice(0, 1);
  const unresolvedVideos = [];
  for (const indexPath of downloadIndexes) {
    try {
      const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
      for (const item of index.items || []) {
        for (const video of item.videos || []) {
          if (video.skippedLong) {
            unresolvedVideos.push({
              statusUrl: item.statusUrl,
              id: video.id,
              estimatedDuration: video.estimatedDuration,
              source: video.source,
              reason: "Skipped because estimated duration exceeded maxVideoSeconds.",
            });
          } else if (video.error) {
            unresolvedVideos.push({
              statusUrl: item.statusUrl,
              id: video.id,
              error: video.error,
              source: video.source,
              reason: "Video source was missing or download failed.",
            });
          }
        }
      }
    } catch {}
  }
  return {
    updatedAt: new Date().toISOString(),
    root,
    folders: currentRows.length,
    images: currentRows.reduce((n, row) => n + row.images, 0),
    playableVideos: currentRows.reduce((n, row) => n + row.videos, 0),
    bytes: currentRows.reduce((n, row) => n + row.bytes, 0),
    csvPath: path.join(root, "archive-index.csv"),
    invalidVideos,
    unresolvedVideos,
    notes: [
      invalid.length ? "Some invalid MP4s were found; inspect invalidVideos." : "All MP4 files in media folders have positive duration by ffprobe.",
      "Capped HLS videos may be video-only/no audio.",
      allDownloadIndexes ? "unresolvedVideos includes every download index." : "unresolvedVideos is from the latest download index only; inspect manifests for older batch indexes.",
    ],
  };
}

function writeCsv(file, currentRows) {
  const esc = (value) => `"${String(value ?? "").replace(/"/g, '""').replace(/\n/g, " ")}"`;
  const lines = ["statusUrl,folder,images,videos,bytes,text"];
  for (const row of currentRows) lines.push([row.statusUrl, row.folder, row.images, row.videos, row.bytes, row.text].map(esc).join(","));
  fs.writeFileSync(file, `${lines.join("\n")}\n`);
}

function ffprobeDuration(file) {
  const proc = spawnSync("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=nk=1:nw=1",
    file,
  ], { encoding: "utf8" });
  return Number((proc.stdout || "").trim());
}

function uniquePath(file) {
  if (!fs.existsSync(file)) return file;
  const ext = path.extname(file);
  const base = file.slice(0, -ext.length);
  let i = 2;
  while (fs.existsSync(`${base}-${i}${ext}`)) i++;
  return `${base}-${i}${ext}`;
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
