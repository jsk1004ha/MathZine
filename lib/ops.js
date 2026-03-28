import { randomUUID } from "node:crypto";
import { assertSameOrigin } from "@/lib/security";
import { readCollection, writeCollection } from "@/lib/store";

export function getClientAddress(request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  return request.headers.get("x-real-ip") || "local";
}

export function getRequestFingerprint(request, scope, userId = "") {
  return `${scope}:${userId || getClientAddress(request)}`;
}

export async function assertRateLimit(request, scope, options = {}) {
  const {
    limit = 20,
    windowMs = 60_000,
    userId = "",
    key = getRequestFingerprint(request, scope, userId)
  } = options;
  const now = Date.now();
  const resetAt = new Date(now + windowMs).toISOString();
  const rateLimits = await readCollection("rateLimits");
  const activeEntries = rateLimits.filter((entry) => new Date(entry.resetAt).getTime() > now);
  const current = activeEntries.find((entry) => entry.key === key);

  if (current && current.count >= limit) {
    const retryAfterMs = Math.max(0, new Date(current.resetAt).getTime() - now);
    const error = new Error("요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.");
    error.code = "RATE_LIMITED";
    error.status = 429;
    error.details = { retryAfterMs };
    throw error;
  }

  if (current) {
    current.count += 1;
    current.updatedAt = new Date(now).toISOString();
  } else {
    activeEntries.push({
      id: `rate_${randomUUID()}`,
      key,
      scope,
      count: 1,
      limit,
      resetAt,
      updatedAt: new Date(now).toISOString()
    });
  }

  await writeCollection("rateLimits", activeEntries);
}

export async function logAuditEvent(action, payload = {}) {
  const logs = await readCollection("auditLogs");
  logs.push({
    id: `audit_${randomUUID()}`,
    action,
    payload,
    createdAt: new Date().toISOString()
  });
  await writeCollection("auditLogs", logs.slice(-1000));
}

export function logStructuredEvent(level, event, details = {}) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    event,
    ...details
  };

  const line = JSON.stringify(entry);

  if (level === "error") {
    console.error(line);
    return;
  }

  console.log(line);
}

export async function assertStateChangeAllowed(request, scope, options = {}) {
  assertSameOrigin(request);
  await assertRateLimit(request, scope, options);
}
