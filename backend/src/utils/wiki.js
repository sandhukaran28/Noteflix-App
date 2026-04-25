"use strict";

const { getConfig } = require("../lib/config");

async function fetchWikiSummary(topic) {
  if (!topic) return null;

  const cfg = getConfig();
  const lang = (cfg.wiki?.lang || "en").toLowerCase();
  const maxChars = Number(cfg.wiki?.maxChars || 1200);
  const encTitle = encodeURIComponent(String(topic).trim());

  try {
    const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encTitle}`;
    const uaContact = process.env.WIKI_USER_AGENT_CONTACT || "noreply@example.com";

    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": `Noteflix/1.0 (${uaContact})`,
      },
    });
    if (!res.ok) return null;

    const json = await res.json();
    const text = (json.extract || json.description || "").trim();
    return text
      ? text.length > maxChars
        ? text.slice(0, maxChars - 3) + "..."
        : text
      : null;
  } catch {
    return null;
  }
}

module.exports = { fetchWikiSummary };
