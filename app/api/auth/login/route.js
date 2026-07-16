import { applySessionCookie, loginUser } from "@/lib/auth";
import { jsonError, jsonSuccess, noStoreHeaders } from "@/lib/api";
import { assertRateLimit, assertStateChangeAllowed, getHashedRateLimitKey, logAuditEvent } from "@/lib/ops";
import { sanitizeText } from "@/lib/security";

const LOGIN_RATE_LIMIT_WINDOW_MS = 10 * 60_000;

export async function POST(request) {
  try {
    await assertStateChangeAllowed(request, "auth.login.ip", { limit: 60, windowMs: LOGIN_RATE_LIMIT_WINDOW_MS });
    const body = await request.json();
    const loginId = sanitizeText(body.riroId, { maxLength: 40 }).toLowerCase();
    const password = sanitizeText(body.password, { maxLength: 80 });
    await assertRateLimit(request, "auth.login.account", {
      limit: 20,
      windowMs: LOGIN_RATE_LIMIT_WINDOW_MS,
      key: getHashedRateLimitKey("auth.login.account", loginId)
    });
    const { user, sessionToken, rememberMe } = await loginUser(
      loginId,
      password,
      { rememberMe: body.rememberMe }
    );

    await logAuditEvent("auth.login", {
      userId: user.id,
      authProvider: user.authProvider,
      role: user.role
    });
    const response = jsonSuccess({ user }, { headers: noStoreHeaders() });
    applySessionCookie(response, sessionToken, rememberMe);
    return response;
  } catch (error) {
    return jsonError(error, { code: "AUTH_LOGIN_FAILED" });
  }
}
