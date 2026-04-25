"use strict";
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

function sh(cmd, { timeoutMs = 60000 } = {}) {
  return new Promise((resolve) => {
    const child = spawn("bash", ["-c", cmd]);
    let stdout = "";
    let stderr = "";
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };
    const timer = setTimeout(() => {
      try { child.kill("SIGKILL"); } catch {}
      finish({ stdout, stderr: stderr + `\n[sh] killed after ${timeoutMs}ms`, status: -1, timedOut: true });
    }, timeoutMs);
    child.stdout?.on("data", (d) => { stdout += d.toString(); });
    child.stderr?.on("data", (d) => { stderr += d.toString(); });
    child.on("close", (code) => finish({ stdout, stderr, status: code ?? -1 }));
    child.on("error", (err) => finish({ stdout: "", stderr: String(err), status: -1 }));
  });
}

async function hasCmd(name) {
  const r = await sh(`command -v ${name} || which ${name} || true`, { timeoutMs: 5000 });
  return r.status === 0 && r.stdout.trim().length > 0;
}

const PIPER_BIN = process.env.PIPER_BIN || "piper";

async function synthesizePodcast(scriptLines, outPath, isDuet, voices = {}) {
  if (!(await hasCmd(PIPER_BIN))) {
    throw new Error(`${PIPER_BIN} not found. Install Piper TTS and/or set PIPER_BIN`);
  }
  const { voiceA, voiceB } = voices;
  if (!voiceA) throw new Error("voices.voiceA is required (path to .onnx)");
  if (isDuet && !voiceB) throw new Error("voices.voiceB is required (path to .onnx)");

  const tmpDir = path.join(path.dirname(outPath), "piper_tmp");
  fs.mkdirSync(tmpDir, { recursive: true });

  const parts = [];
  let okSegments = 0;
  let failedSegments = 0;
  for (let i = 0; i < scriptLines.length; i++) {
    const line = scriptLines[i].trim();
    if (!line) continue;

    const which = isDuet ? (i % 2 === 0 ? "A" : "B") : "A";
    const primaryModel = which === "A" ? voiceA : (voiceB || voiceA);

    const txt = path.join(tmpDir, `seg-${String(i + 1).padStart(3, "0")}.txt`);
    const wav = path.join(tmpDir, `seg-${String(i + 1).padStart(3, "0")}.wav`);
    fs.writeFileSync(txt, line + "\n", "utf8");

    const tryModels = [primaryModel];
    if (primaryModel !== voiceA) tryModels.push(voiceA); // fall back to A if B fails

    let segOk = false;
    for (const model of tryModels) {
      try { fs.unlinkSync(wav); } catch {}
      const cmd = `${PIPER_BIN} --model "${model}" --input_file "${txt}" --output_file "${wav}" --sentence_silence 0.15`;
      const r = await sh(cmd, { timeoutMs: 60000 });
      const exists = fs.existsSync(wav);
      const size = exists ? fs.statSync(wav).size : 0;
      if (r.status === 0 && exists && size > 1000) {
        segOk = true;
        break;
      }
      // try next model (fallback)
    }

    if (segOk) {
      parts.push(wav);
      okSegments++;
      const pad = path.join(tmpDir, `sil-${String(i + 1).padStart(3, "0")}.wav`);
      const padR = await sh(`ffmpeg -y -f lavfi -i anullsrc=r=22050:cl=mono -t 0.20 -c:a pcm_s16le "${pad}"`, { timeoutMs: 10000 });
      if (padR.status === 0 && fs.existsSync(pad)) parts.push(pad);
    } else {
      failedSegments++;
    }
  }

  if (parts.length === 0) {
    throw new Error(`piper produced no usable segments (${failedSegments} failed)`);
  }

  const concatList = path.join(tmpDir, "concat.txt");
  fs.writeFileSync(
    concatList,
    parts.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join("\n"),
    "utf8"
  );

  const r2 = await sh(
    `ffmpeg -y -f concat -safe 0 -i "${concatList}" -ar 22050 -ac 1 -c:a pcm_s16le "${outPath}"`,
    { timeoutMs: 60000 }
  );
  if (r2.status !== 0 || !fs.existsSync(outPath)) {
    throw new Error(`ffmpeg concat failed: ${r2.stderr || r2.stdout}`);
  }
  if (failedSegments > 0) {
    console.warn(`[tts] ${failedSegments} segments failed, used ${okSegments}`);
  }
  return outPath;
}

module.exports = { synthesizePodcast };
