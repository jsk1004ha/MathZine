import { applySessionCookie, loginUser } from "@/lib/auth";
import { jsonError, jsonSuccess, noStoreHeaders } from "@/lib/api";
import { assertStateChangeAllowed, logAuditEvent } from "@/lib/ops";
import { sanitizeText } from "@/lib/security";

export async function POST(request) {
  try {
    await assertStateChangeAllowed(request, "auth.login", { limit: 10, windowMs: 10 * 60_000 });
    const body = await request.json();
    const { user, sessionToken, rememberMe } = await loginUser(
      sanitizeText(body.riroId, { maxLength: 40 }),
      sanitizeText(body.password, { maxLength: 80 }),
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
