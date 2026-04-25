"use strict";

const { queryByPrefix } = require("../ddb");

const FREE_LIMIT = Number(process.env.QUOTA_FREE_LIMIT || 3);
const PRO_GROUP = process.env.PRO_GROUP || "Pro";
const ADMIN_GROUP = process.env.COGNITO_ADMIN_GROUP || "Admin";
const COUNTABLE_STATUSES = new Set(["pending", "running", "done"]);

class QuotaExceededError extends Error {
  constructor({ used, limit }) {
    super(`Free tier limit reached: ${used}/${limit} jobs used`);
    this.code = "QUOTA_EXCEEDED";
    this.statusCode = 429;
    this.used = used;
    this.limit = limit;
  }
}

function isPro(user) {
  const groups = user?.groups || [];
  return groups.includes(PRO_GROUP) || groups.includes(ADMIN_GROUP);
}

async function getUsage(userId) {
  const items = await queryByPrefix(userId, "JOB#");
  return items
    .filter((it) => it.entity === "job" && COUNTABLE_STATUSES.has(it.status))
    .length;
}

async function getQuota(userId, user) {
  const pro = isPro(user);
  const used = await getUsage(userId);
  return {
    used,
    limit: pro ? null : FREE_LIMIT,
    remaining: pro ? null : Math.max(0, FREE_LIMIT - used),
    isPro: pro,
    plan: pro ? "Pro" : "Free",
  };
}

async function assertCanCreateJob(userId, user) {
  if (isPro(user)) return;
  const used = await getUsage(userId);
  if (used >= FREE_LIMIT) {
    throw new QuotaExceededError({ used, limit: FREE_LIMIT });
  }
}

module.exports = {
  isPro,
  getUsage,
  getQuota,
  assertCanCreateJob,
  QuotaExceededError,
  FREE_LIMIT,
};
