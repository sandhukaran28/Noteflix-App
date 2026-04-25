"use strict";

const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");

const REGION = process.env.AWS_REGION || "us-east-1";
const MODEL_ID = process.env.BEDROCK_MODEL_ID || "au.anthropic.claude-haiku-4-5-20251001-v1:0";

let client = null;
function getClient() {
  if (!client) client = new BedrockRuntimeClient({ region: REGION });
  return client;
}

async function generateScript(prompt, { maxTokens = 1024, temperature = 0.6 } = {}) {
  const body = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: maxTokens,
    temperature,
    messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
  };

  const resp = await getClient().send(new InvokeModelCommand({
    modelId: MODEL_ID,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify(body),
  }));

  const text = new TextDecoder().decode(resp.body);
  const json = JSON.parse(text);
  const out = (json.content || []).map((c) => c.text || "").join("").trim();
  if (!out) throw new Error("Bedrock returned empty content");
  return out;
}

module.exports = { generateScript };
