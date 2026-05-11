"use strict";

const fs = require("fs");
const { spawnSync } = require("child_process");

function shSync(cmd) {
  const r = spawnSync("bash", ["-c", cmd], { encoding: "utf8" });
  return {
    status: r.status ?? -1,
    stdout: r.stdout || "",
    stderr: r.stderr || "",
  };
}

const HTML_ENTITIES = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
};
function decodeHtml(s) {
  return s.replace(/&(amp|lt|gt|quot|#39|apos);/g, (m) => HTML_ENTITIES[m] || m);
}

// Parse Poppler `pdftotext -bbox-layout` XHTML output.
// Returns: [{ width, height, words: [{ xMin, yMin, xMax, yMax, text }] }] per page.
function parseBboxLayout(htmlPath) {
  const html = fs.readFileSync(htmlPath, "utf8");
  const pages = [];
  const pageRe =
    /<page\s+width="([^"]+)"\s+height="([^"]+)">([\s\S]*?)<\/page>/g;
  const wordRe =
    /<word\s+xMin="([^"]+)"\s+yMin="([^"]+)"\s+xMax="([^"]+)"\s+yMax="([^"]+)">([\s\S]*?)<\/word>/g;
  let m;
  while ((m = pageRe.exec(html)) !== null) {
    const width = parseFloat(m[1]);
    const height = parseFloat(m[2]);
    const inner = m[3];
    const words = [];
    let wm;
    wordRe.lastIndex = 0;
    while ((wm = wordRe.exec(inner)) !== null) {
      const text = decodeHtml(wm[5]).trim();
      if (!text) continue;
      words.push({
        xMin: parseFloat(wm[1]),
        yMin: parseFloat(wm[2]),
        xMax: parseFloat(wm[3]),
        yMax: parseFloat(wm[4]),
        text,
      });
    }
    pages.push({ width, height, words });
  }
  return pages;
}

function getImageSize(imgPath) {
  const r = shSync(
    `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "${imgPath}"`
  );
  if (r.status !== 0) return null;
  const parts = r.stdout.trim().split(",");
  const w = Number(parts[0]);
  const h = Number(parts[1]);
  if (!w || !h) return null;
  return { w, h };
}

function normWord(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

const STOPWORDS = new Set([
  "a","an","the","and","or","but","of","to","in","on","at","for","with","by",
  "is","are","was","were","be","been","being","this","that","these","those",
  "it","its","as","from","we","you","i","he","she","they","them","our","your",
  "have","has","had","do","does","did","not","no","so","if","then","than",
  "will","would","can","could","should","may","might","just","also","more",
  "about","into","over","under","up","down","out","very","too","because",
]);

function keywords(text) {
  return text
    .split(/\s+/)
    .map(normWord)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}

// Parse a WEBVTT string into [{ start, end, text }] in seconds.
function parseVtt(vtt) {
  const cues = [];
  const blocks = vtt.split(/\r?\n\r?\n+/);
  for (const block of blocks) {
    const lines = block
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const tsIdx = lines.findIndex((l) => l.includes("-->"));
    if (tsIdx < 0) continue;
    const [sRaw, eRaw] = lines[tsIdx].split("-->").map((x) => x.trim());
    const start = vttTimeToSec(sRaw);
    const end = vttTimeToSec(eRaw);
    const text = lines
      .slice(tsIdx + 1)
      .join(" ")
      .replace(/^(alex|sam):\s*/i, "")
      .trim();
    if (text && isFinite(start) && isFinite(end) && end > start) {
      cues.push({ start, end, text });
    }
  }
  return cues;
}

function vttTimeToSec(s) {
  const parts = s.split(":").map((x) => Number(x));
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

// For a cue, find the best page + word-union bbox (in PDF points).
// Returns null when no useful match.
function findRegionForCue(cueText, pages) {
  const cueSet = new Set(keywords(cueText));
  if (cueSet.size === 0) return null;

  let best = null;
  for (let p = 0; p < pages.length; p++) {
    const page = pages[p];
    const matches = page.words.filter((w) => cueSet.has(normWord(w.text)));
    if (matches.length === 0) continue;
    const uniqueMatches = new Set(matches.map((w) => normWord(w.text))).size;
    const score = matches.length + uniqueMatches * 1.5;
    if (!best || score > best.score) best = { pageIndex: p, matches, page, score };
  }
  if (!best) return null;

  const m = best.matches;
  const xMin = Math.min(...m.map((w) => w.xMin));
  const yMin = Math.min(...m.map((w) => w.yMin));
  const xMax = Math.max(...m.map((w) => w.xMax));
  const yMax = Math.max(...m.map((w) => w.yMax));
  return {
    pageIndex: best.pageIndex,
    bbox: {
      xMin,
      yMin,
      xMax,
      yMax,
      pageW: best.page.width,
      pageH: best.page.height,
    },
  };
}

// Convert a PDF-point bbox to a PNG-pixel crop rectangle, padded and clamped to 16:9.
function pdfBboxToCrop(bbox, png, opts = {}) {
  const outAspect = opts.outAspect ?? 16 / 9;
  const padPct = opts.padPct ?? 0.18;
  const minWidthPct = opts.minWidthPct ?? 0.55;
  const minHeightPct = opts.minHeightPct ?? 0.35;

  const sx = png.w / bbox.pageW;
  const sy = png.h / bbox.pageH;
  let x1 = bbox.xMin * sx;
  let y1 = bbox.yMin * sy;
  let x2 = bbox.xMax * sx;
  let y2 = bbox.yMax * sy;

  const pw = Math.max(20, x2 - x1);
  const ph = Math.max(20, y2 - y1);
  x1 -= pw * padPct;
  x2 += pw * padPct;
  y1 -= ph * padPct;
  y2 += ph * padPct;

  let cw = x2 - x1;
  let ch = y2 - y1;

  const minW = png.w * minWidthPct;
  const minH = png.h * minHeightPct;
  if (cw < minW) {
    const cx = (x1 + x2) / 2;
    x1 = cx - minW / 2;
    x2 = cx + minW / 2;
    cw = minW;
  }
  if (ch < minH) {
    const cy = (y1 + y2) / 2;
    y1 = cy - minH / 2;
    y2 = cy + minH / 2;
    ch = minH;
  }

  const currentAspect = cw / ch;
  if (currentAspect > outAspect) {
    const needH = cw / outAspect;
    const cy = (y1 + y2) / 2;
    y1 = cy - needH / 2;
    y2 = cy + needH / 2;
  } else {
    const needW = ch * outAspect;
    const cx = (x1 + x2) / 2;
    x1 = cx - needW / 2;
    x2 = cx + needW / 2;
  }

  // Clamp: shift back into page, then hard-clamp.
  if (x1 < 0) { x2 -= x1; x1 = 0; }
  if (y1 < 0) { y2 -= y1; y1 = 0; }
  if (x2 > png.w) { x1 -= x2 - png.w; x2 = png.w; }
  if (y2 > png.h) { y1 -= y2 - png.h; y2 = png.h; }
  x1 = Math.max(0, x1);
  y1 = Math.max(0, y1);
  x2 = Math.min(png.w, x2);
  y2 = Math.min(png.h, y2);

  return {
    x: Math.round(x1),
    y: Math.round(y1),
    w: Math.round(x2 - x1),
    h: Math.round(y2 - y1),
  };
}

// When no semantic match exists, slice the page into N vertical sections so we
// still get cuts (top → middle → bottom rather than one slow zoom).
function fallbackRegion(png, sectionIdx, sectionCount, outAspect = 16 / 9) {
  const safeCount = Math.max(1, sectionCount);
  const idx = Math.max(0, Math.min(safeCount - 1, sectionIdx));
  const stripH = png.h / safeCount;
  const centerY = stripH * (idx + 0.5);

  let ch = stripH * 1.6;
  let cw = ch * outAspect;
  if (cw > png.w) {
    cw = png.w;
    ch = cw / outAspect;
  }
  let x = (png.w - cw) / 2;
  let y = centerY - ch / 2;
  x = Math.max(0, Math.min(png.w - cw, x));
  y = Math.max(0, Math.min(png.h - ch, y));
  return {
    x: Math.round(x),
    y: Math.round(y),
    w: Math.round(cw),
    h: Math.round(ch),
  };
}

module.exports = {
  parseBboxLayout,
  parseVtt,
  getImageSize,
  findRegionForCue,
  pdfBboxToCrop,
  fallbackRegion,
};
