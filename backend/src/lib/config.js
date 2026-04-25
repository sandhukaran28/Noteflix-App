"use strict";

let cached = null;

function asBool(v, fallback = false) {
  if (v === undefined || v === null) return fallback;
  const s = String(v).trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "on";
}

function asNum(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

async function loadConfig() {
  if (cached) return cached;

  cached = {
    awsRegion: process.env.AWS_REGION || "us-east-1",
    apiBasePath: process.env.API_BASE_PATH || "/api/v1",
    cognito: {
      userPoolId: process.env.COGNITO_USER_POOL_ID || "",
      clientId: process.env.COGNITO_CLIENT_ID || "",
    },
    s3: {
      bucket: process.env.S3_BUCKET || "",
      prefix: (process.env.S3_PREFIX || "noteflix/outputs").replace(/\/+$/, ""),
      assetsPrefix: (process.env.ASSETS_PREFIX || "noteflix/assets").replace(/\/+$/, ""),
    },
    ddb: {
      table: process.env.DDB_TABLE || "noteflix",
    },
    bedrock: {
      modelId: process.env.BEDROCK_MODEL_ID || "au.anthropic.claude-haiku-4-5-20251001-v1:0",
      enabled: asBool(process.env.BEDROCK_ENABLED, true),
    },
    wiki: {
      enabled: asBool(process.env.WIKI_ENABLED, false),
      lang: process.env.WIKI_LANG || "en",
      maxChars: asNum(process.env.WIKI_MAX_CHARS, 1200),
      cacheTtlSeconds: asNum(process.env.WIKI_CACHE_TTL, 2592000),
      apiBase: process.env.WIKI_API_BASE || "",
    },
  };

  return cached;
}

function getConfig() {
  if (!cached) throw new Error("Config not loaded yet. Call loadConfig() first.");
  return cached;
}

module.exports = { loadConfig, getConfig };
