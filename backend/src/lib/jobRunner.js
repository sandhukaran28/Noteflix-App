"use strict";

const path = require("path");
const fs = require("fs");
const { v4: uuid } = require("uuid");
const { DDB_PK_NAME, sks, putItem, putJobEvent } = require("../ddb");
const { bumpVersion } = require("./cache");
const { assertCanCreateJob } = require("./quota");
const { processJob } = require("../worker/processor");

const DATA_ROOT = process.env.DATA_ROOT || "./data";
const TMP_DIR = path.join(DATA_ROOT, "tmp");
const OUT_DIR = path.join(DATA_ROOT, "outputs");
fs.mkdirSync(TMP_DIR, { recursive: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

const DEFAULTS = {
  style: "kenburns",
  duration: 90,
  dialogue: "solo",
  encodeProfile: "balanced",
};

async function createAndStartJob({ userId, asset, ownerSub, params = {}, user = null }) {
  await assertCanCreateJob(userId, user);
  const merged = { ...DEFAULTS, ...params };

  const id = uuid();
  const jobDir = path.join(TMP_DIR, id);
  const logsPath = path.join(jobDir, "logs.txt");
  const outDir = path.join(OUT_DIR, id);
  const outputPath = path.join(outDir, "video.mp4");
  fs.mkdirSync(jobDir, { recursive: true });
  fs.mkdirSync(outDir, { recursive: true });

  const now = new Date().toISOString();
  const jobItem = {
    [DDB_PK_NAME]: userId,
    sk: sks.job(id),
    entity: "job",
    id,
    assetId: asset.id,
    owner: ownerSub || "unknown",
    params: merged,
    status: "pending",
    createdAt: now,
    startedAt: null,
    finishedAt: null,
    cpuSeconds: 0,
    outputPath: null,
    logsPath,
    s3Bucket: null,
    s3Key: null,
  };
  await putItem(jobItem);
  await bumpVersion("jobs", userId);

  putJobEvent(id, userId, "pending", "Job created").catch(() => {});
  await bumpVersion("audit", userId);

  const ctx = {
    userId,
    jobDir,
    outDir,
    outputPath,
    logsPath,
    duration: merged.duration,
    dialogue: merged.dialogue,
    encodeProfile: merged.encodeProfile,
  };

  processJob(id, asset, ctx).catch((e) => {
    console.error(`job ${id} crashed:`, e);
  });

  return id;
}

module.exports = { createAndStartJob, DEFAULTS };
