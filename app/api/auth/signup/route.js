import { applySessionCookie, signUpWithRiro } from "@/lib/auth";
import { jsonError, jsonSuccess, noStoreHeaders } from "@/lib/api";
import { assertStateChangeAllowed, logAuditEvent } from "@/lib/ops";
import { sanitizeText, withErrorCode } from "@/lib/security";

export async function POST(request) {
  try {
    await assertStateChangeAllowed(request, "auth.signup", { limit: 5, windowMs: 30 * 60_000 });
    const body = await request.json();

    if (!body.acceptedTerms) {
      throw withErrorCode(new Error("약관 동의가 필요합니다."), "TERMS_REQUIRED", 400);
    }

    const { user, sessionToken, rememberMe } = await signUpWithRiro(
      sanitizeText(body.riroId, { maxLength: 30 }),
      sanitizeText(body.password, { maxLength: 80 }),
      sanitizeText(body.nickname, { maxLength: 24 }),
      { rememberMe: body.rememberMe }
    );

    await logAuditEvent("auth.signup", {
      userId: user.id,
      authProvider: user.authProvider,
      role: user.role
    });
    const response = jsonSuccess({ user }, { headers: noStoreHeaders() });
    applySessionCookie(response, sessionToken, rememberMe);
    return response;
  } catch (error) {
    return jsonError(error, { code: "AUTH_SIGNUP_FAILED" });
  }
}
