const fs = require("fs");
const path = require("path");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Insan davranışına yakın rastgele bekleme süresi (ms)
function randomDelay(minMs, maxMs) {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return sleep(ms);
}

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function extOf(url) {
  const clean = url.split("?")[0];
  const ext = path.extname(clean);
  return ext && ext.length <= 5 ? ext : ".png";
}

module.exports = { ensureDir, sleep, randomDelay, slugify, extOf };
