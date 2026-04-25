"use strict";

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { pipeline } = require("stream/promises");
const { synthesizePodcast } = require("../utils/tts");
const { fetchWikiSummary } = require("../utils/wiki");
const { generateScript } = require("../lib/llm");
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const { bumpVersion } = require("../lib/cache");
const {
  sks,
  updateItem,
  putJobEvent,
} = require("../ddb");

const REGION = process.env.AWS_REGION || "us-east-1";
const S3_BUCKET = process.env.S3_BUCKET;
const S3_PREFIX = (process.env.S3_PREFIX || "noteflix/outputs").replace(/\/+$/, "");
const BEDROCK_ENABLED = (process.env.BEDROCK_ENABLED ?? "true").toLowerCase() !== "false";

const s3 = new S3Client({ region: REGION });

function s3KeyForJob(jobId) {
  return `${S3_PREFIX}/${jobId}/video.mp4`;
}

function sh(cmd, opts = {}) {
  return new Promise((resolve) => {
    const child = spawn("bash", ["-lc", cmd], { ...opts });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (d) => { stdout += d.toString(); });
    child.stderr?.on("data", (d) => { stderr += d.toString(); });
    child.on("close", (code) => resolve({ stdout, stderr, status: code ?? -1 }));
    child.on("error", (err) => resolve({ stdout: "", stderr: String(err), status: -1 }));
  });
}

async function hasCmd(name) {
  const r = await sh(`command -v ${name} || which ${name} || true`);
  return r.status === 0 && r.stdout.trim().length > 0;
}

async function downloadS3ToFile(bucket, key, toPath) {
  const resp = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  await pipeline(resp.Body, fs.createWriteStream(toPath));
}

async function getAudioDuration(file) {
  try {
    const out = await sh(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${file}"`
    );
    if (out.status === 0) return Math.ceil(parseFloat(out.stdout.trim()));
  } catch (e) {}
  return null;
}

function makeVttFromScript(text) {
  const cleaned = text.replace(/\r/g, "").trim();
  const parts = cleaned.split(/(?<=[\.\!\?])\s+/).filter(Boolean);
  let t = 0;
  const pad = (n) => String(n).padStart(2, "0");
  const stamp = (sec) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec - Math.floor(sec)) * 1000);
    return `${pad(h)}:${pad(m)}:${pad(s)}.${String(ms).padStart(3, "0")}`;
  };
  let vtt = "WEBVTT\n\n";
  for (let i = 0; i < parts.length; i++) {
    const dur = 3;
    const start = stamp(t);
    const end = stamp(t + dur);
    vtt += `${i + 1}\n${start} --> ${end}\n${parts[i]}\n\n`;
    t += dur;
  }
  if (parts.length === 0) {
    vtt += `1\n00:00:00.000 --> 00:00:03.000\n(no script)\n\n`;
  }
  return vtt;
}

function cleanForTTS(text) {
  return text
    .normalize("NFKD")
    .replace(/Here is the script[^:]*:\s*/gi, "")
    .replace(/\b(Alex|Sam):\s*/gi, "")
    .replace(/[^\x00-\x7F]+/g, " ")
    .replace(/\*\*?\s*\[[^\]]+\]\s*\*?\s*/g, " ")
    .replace(/\[[0-9:\- ]+seconds?\]/gi, " ")
    .replace(/\*\*/g, " ")
    .replace(/[_`#>•▪︎•·–—""'']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function processJob(id, asset, ctx) {
  const log = (s) => fs.appendFileSync(ctx.logsPath, s + "\n");
  const start = Date.now();

  await updateItem(
    ctx.userId,
    sks.job(id),
    "SET #status = :s, #startedAt = :t",
    { "#status": "status", "#startedAt": "startedAt" },
    { ":s": "running", ":t": new Date().toISOString() }
  );
  await bumpVersion("jobs", ctx.userId);

  putJobEvent(id, ctx.userId, "running", "Processing started").catch(() => {});
  await bumpVersion("audit", ctx.userId);

  try {
    const jobDir = ctx.jobDir;
    fs.mkdirSync(jobDir, { recursive: true });

    let sourcePath;
    let isPdf;

    if (asset.s3Bucket && asset.s3Key) {
      const ext = path.extname(asset.s3Key || "").toLowerCase();
      isPdf = asset.type === "pdf" || ext === ".pdf";
      sourcePath = path.join(jobDir, "source" + (ext || (isPdf ? ".pdf" : "")));
      await downloadS3ToFile(asset.s3Bucket, asset.s3Key, sourcePath);
    } else {
      if (!asset.path) throw new Error("asset has no s3Key and no local path");
      sourcePath = asset.path;
      const ext = path.extname(sourcePath || "").toLowerCase();
      isPdf = asset.type === "pdf" || ext === ".pdf";
    }

    if (isPdf) {
      if (!(await hasCmd("pdftoppm")))
        throw new Error("pdftoppm not found (install poppler-utils)");
      const p1 = await sh(`pdftoppm -png "${sourcePath}" "${jobDir}/slide"`);
      log(p1.stdout || "");
      log(p1.stderr || "");
      if (p1.status !== 0) throw new Error("pdf->images failed");
    } else {
      const slide1 = path.join(jobDir, "slide-001.png");
      const p1 = await sh(`cp "${sourcePath}" "${slide1}"`);
      log(p1.stderr || "");
      if (p1.status !== 0) throw new Error("copy image failed");
    }

    const ls = await sh(`ls -l "${jobDir}" | head -n 40`);
    log(ls.stdout || "");
    log(ls.stderr || "");

    let scriptText = "";
    if (isPdf) {
      const hasPdftotext = await hasCmd("pdftotext");
      if (!hasPdftotext)
        log("WARN: pdftotext not found; using fallback summary prompt.");
      let notes = "";
      if (hasPdftotext) {
        const textPath = path.join(ctx.jobDir, "notes.txt");
        const t1 = await sh(`pdftotext "${sourcePath}" "${textPath}"`);
        log(t1.stderr || "");
        if (t1.status === 0 && fs.existsSync(textPath)) {
          notes = fs.readFileSync(textPath, "utf8");
        }
      }

      const wpm = 150;
      const targetSeconds = Math.max(15, Math.min(60, Number(ctx.duration || 60)));
      const targetWords = Math.round((wpm / 60) * targetSeconds);

      const duet = ctx.dialogue === "duet";
      const excerpt = (notes || "").trim().slice(0, 4000);

      let wiki = null;
      try {
        const orig = (() => {
          try {
            const meta = asset.meta || {};
            return (meta.originalName || "").replace(/\.[^.]+$/, "");
          } catch {
            return "";
          }
        })();
        if (excerpt.length < 120 && orig) {
          wiki = await fetchWikiSummary(orig);
        }
      } catch {}

      const prompt = `
You are scripting a short educational podcast${duet ? " with TWO speakers (Alex and Sam)" : ""}.
${duet
  ? "Write alternating lines starting with 'Alex:' and 'Sam:'."
  : "Write a single narrator script."}

Constraints:
- Target length: ~${targetWords} words (≈ ${targetSeconds} seconds at ~${wpm} wpm).
- Friendly, precise, clear. Short sentences (6–16 words). No filler.
- Keep it grounded in the NOTES content. If missing, you MAY use WIKI if provided.
- Do NOT include stage directions, timecodes, or markdown—just the spoken lines.

NOTES:
${excerpt || "(No extracted text available.)"}

${wiki ? `WIKI:\n${wiki}\n` : ""}`.trim();

      if (BEDROCK_ENABLED) {
        try {
          log(`Calling Bedrock (${process.env.BEDROCK_MODEL_ID || "claude-3-haiku"})...`);
          scriptText = await generateScript(prompt, {
            maxTokens: Math.max(512, Math.round(targetWords * 2)),
            temperature: 0.6,
          });
          log(`Bedrock returned ${scriptText.length} chars`);
        } catch (e) {
          log("Bedrock call failed: " + e.message);
          scriptText =
            "Welcome to NoteFlix. This is an automatically generated study summary. Please review your notes and key definitions.";
        }
      } else {
        log("Bedrock disabled; using fallback script.");
        scriptText =
          "Welcome to NoteFlix. This is an automatically generated study summary. Please review your notes and key definitions.";
      }
    } else {
      scriptText =
        "This video animates your uploaded slide. Add more pages for a richer episode.";
    }

    const scriptPath = path.join(ctx.jobDir, "script.txt");
    fs.writeFileSync(scriptPath, scriptText, "utf8");

    log("Cleaning script for TTS...");
    const cleaned = cleanForTTS(scriptText);

    let scriptLines;
    if (ctx.dialogue === "duet") {
      const labeled = cleaned
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);
      const hasLabels = labeled.some((l) => /^alex:|^sam:/i.test(l));
      scriptLines = hasLabels
        ? labeled.map((l) => l.replace(/^(alex|sam):\s*/i, ""))
        : cleaned.split(/(?<=[.!?])\s+/).filter(Boolean);
    } else {
      scriptLines = [cleaned];
    }

    fs.writeFileSync(
      path.join(ctx.jobDir, "tts_clean.txt"),
      scriptLines.join("\n"),
      "utf8"
    );
    log("Starting TTS synthesis (Piper)...");
    let narrationPath = null;
    try {
      narrationPath = path.join(ctx.jobDir, "narration.wav");
      const voices = {
        voiceA: process.env.PIPER_VOICE_A || "/app/models/en_US-amy-medium.onnx",
        voiceB: process.env.PIPER_VOICE_B || "/app/models/en_US-ryan-high.onnx",
      };
      await synthesizePodcast(scriptLines, narrationPath, ctx.dialogue === "duet", voices);
      log("TTS synthesis complete");
    } catch (e) {
      log("TTS synthesis failed: " + e.message);
      narrationPath = null;
    }
    const hasAudio = !!narrationPath && fs.existsSync(narrationPath);

    const vtt = makeVttFromScript(scriptText);
    const vttPath = path.join(ctx.jobDir, "captions.vtt");
    fs.writeFileSync(vttPath, vtt, "utf8");

    const slides = fs
      .readdirSync(ctx.jobDir)
      .filter((f) => /^slide-.*\.png$/i.test(f))
      .sort();
    const nSlides = Math.max(1, slides.length);

    let totalDuration = ctx.duration || 90;
    if (hasAudio) {
      const dur = await getAudioDuration(narrationPath);
      if (dur && dur > 0) {
        totalDuration = dur;
        log(`Detected narration length: ${dur}s`);
      }
    }

    const profile = String(ctx.encodeProfile || "balanced").toLowerCase();
    const perSlideSec = Math.max(4, Math.round(totalDuration / nSlides));
    const baseFps = profile === "insane" ? 60 : profile === "heavy" ? 48 : 30;
    const dFrames = perSlideSec * baseFps;
    const fr = 1 / perSlideSec;

    const outW = profile === "insane" ? 3840 : profile === "heavy" ? 2560 : 1920;
    const outH = profile === "insane" ? 2160 : profile === "heavy" ? 1440 : 1080;

    const zoom = `zoompan=z='zoom+0.001':d=${dFrames}:s=${outW}x${outH}`;
    const baseFilters = [
      zoom,
      `scale=${outW}:${outH}:flags=lanczos`,
      `unsharp=5:5:0.5:5:5:0.5`,
      `eq=contrast=1.05:brightness=0.02:saturation=1.05`,
      `vignette=PI/6`,
    ];
    if (profile !== "balanced") {
      baseFilters.push(
        `minterpolate='mi_mode=mci:mc_mode=aobmc:vsbmc=1:fps=${baseFps}'`
      );
    }
    baseFilters.push(`format=yuv420p`);
    const vf = baseFilters.join(",");
    const af = hasAudio ? `-ar 48000 -af "loudnorm=I=-16:LRA=11:TP=-1.5"` : "";

    const preset =
      profile === "insane" ? "veryslow" : profile === "heavy" ? "slower" : "slow";
    const crf = profile === "insane" ? 16 : profile === "heavy" ? 18 : 20;

    if (profile !== "balanced") {
      const passlog = path.join(ctx.jobDir, "ffpass");
      const cmd1 = `ffmpeg -y -threads 0 -framerate ${fr} -pattern_type glob -i "${ctx.jobDir}/slide-*.png" ${hasAudio ? `-i "${narrationPath}"` : ""} -filter_complex "${vf}" -c:v libx264 -preset ${preset} -crf ${crf} -pix_fmt yuv420p -an -pass 1 -passlogfile "${passlog}" -f mp4 /dev/null`;
      log("ENC PASS1: " + cmd1);
      const enc1 = spawn("bash", ["-lc", cmd1]);
      enc1.stdout.on("data", (d) => log(d.toString()));
      enc1.stderr.on("data", (d) => log(d.toString()));
      await new Promise((resolve) => enc1.on("close", resolve));

      const cmd2 = `ffmpeg -y -threads 0 -framerate ${fr} -pattern_type glob -i "${ctx.jobDir}/slide-*.png" ${hasAudio ? `-i "${narrationPath}"` : ""} -filter_complex "${vf}" -c:v libx264 -preset ${preset} -crf ${crf} -pix_fmt yuv420p ${hasAudio ? `${af} -c:a aac -b:a 192k` : ""} -movflags +faststart -shortest -pass 2 -passlogfile "${passlog}" "${ctx.outputPath}"`;
      log("ENC PASS2: " + cmd2);
      const enc2 = spawn("bash", ["-lc", cmd2]);
      enc2.stdout.on("data", (d) => log(d.toString()));
      enc2.stderr.on("data", (d) => log(d.toString()));
      await new Promise((resolve) => enc2.on("close", resolve));
    } else {
      const cmd = hasAudio
        ? `ffmpeg -y -threads 0 -framerate ${fr} -pattern_type glob -i "${ctx.jobDir}/slide-*.png" -i "${narrationPath}" -filter_complex "${vf}" -c:v libx264 -preset ${preset} -crf ${crf} -pix_fmt yuv420p ${af} -c:a aac -b:a 192k -movflags +faststart -shortest "${ctx.outputPath}"`
        : `ffmpeg -y -threads 0 -framerate ${fr} -pattern_type glob -i "${ctx.jobDir}/slide-*.png" -filter_complex "${vf}" -c:v libx264 -preset ${preset} -crf ${crf} -pix_fmt yuv420p -movflags +faststart "${ctx.outputPath}"`;
      log("ENC: " + cmd);
      const enc = spawn("bash", ["-lc", cmd]);
      enc.stdout.on("data", (d) => log(d.toString()));
      enc.stderr.on("data", (d) => log(d.toString()));
      await new Promise((resolve) => enc.on("close", resolve));
    }

    const cpuSeconds = Math.round((Date.now() - start) / 1000);
    if (!fs.existsSync(ctx.outputPath))
      throw new Error("ffmpeg failed to produce output");

    try {
      const outputStat = fs.statSync(ctx.outputPath);
      const metrics = {
        durationSeconds: totalDuration,
        slides: nSlides,
        fpsTarget: baseFps,
        resolution: { width: outW, height: outH },
        profile,
        hasAudio: !!hasAudio,
        audioSeconds: hasAudio ? (await getAudioDuration(narrationPath)) : 0,
        cpuSeconds,
        outputBytes: outputStat?.size || 0,
      };
      fs.writeFileSync(
        path.join(ctx.jobDir, "metrics.json"),
        JSON.stringify(metrics, null, 2)
      );
    } catch (e) {
      log("WARN: failed to write metrics.json: " + e.message);
    }

    let uploaded = false;
    let s3Key = null;
    if (S3_BUCKET) {
      try {
        s3Key = s3KeyForJob(id);
        log(`Uploading output to s3://${S3_BUCKET}/${s3Key} ...`);
        await s3.send(
          new PutObjectCommand({
            Bucket: S3_BUCKET,
            Key: s3Key,
            Body: fs.createReadStream(ctx.outputPath),
            ContentType: "video/mp4",
            ContentDisposition: 'attachment; filename="video.mp4"',
          })
        );
        uploaded = true;
        await updateItem(
          ctx.userId,
          sks.job(id),
          "SET #s3Bucket = :b, #s3Key = :k",
          { "#s3Bucket": "s3Bucket", "#s3Key": "s3Key" },
          { ":b": S3_BUCKET, ":k": s3Key }
        );
        log("S3 upload complete");
      } catch (e) {
        log("WARN: S3 upload failed: " + (e.message || String(e)));
      }
    }

    await updateItem(
      ctx.userId,
      sks.job(id),
      "SET #status=:st, #finishedAt=:fin, #cpuSeconds=:cpu, #outputPath=:out",
      {
        "#status": "status",
        "#finishedAt": "finishedAt",
        "#cpuSeconds": "cpuSeconds",
        "#outputPath": "outputPath",
      },
      {
        ":st": "done",
        ":fin": new Date().toISOString(),
        ":cpu": Math.round((Date.now() - start) / 1000),
        ":out": ctx.outputPath,
      }
    );
    await bumpVersion("jobs", ctx.userId);

    putJobEvent(
      id,
      ctx.userId,
      "done",
      uploaded ? "Encoding complete (uploaded to S3)" : "Encoding complete"
    ).catch(() => {});
    await bumpVersion("audit", ctx.userId);

    log("JOB DONE" + (uploaded ? " (and uploaded to S3)" : ""));
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    try {
      await updateItem(
        ctx.userId,
        sks.job(id),
        "SET #status=:st, #finishedAt=:fin, #cpuSeconds=:cpu",
        {
          "#status": "status",
          "#finishedAt": "finishedAt",
          "#cpuSeconds": "cpuSeconds",
        },
        {
          ":st": "failed",
          ":fin": new Date().toISOString(),
          ":cpu": Math.round((Date.now() - start) / 1000),
        }
      );
      await bumpVersion("jobs", ctx.userId);
      putJobEvent(id, ctx.userId, "failed", msg).catch(() => {});
      await bumpVersion("audit", ctx.userId);
    } catch (e2) {
      console.error("failed to record failure:", e2);
    }
    try { fs.appendFileSync(ctx.logsPath, "FAILED: " + msg + "\n"); } catch {}
  }
}

module.exports = { processJob };
