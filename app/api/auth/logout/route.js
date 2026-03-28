import { clearSessionCookie, logoutFromRequest } from "@/lib/auth";
import { jsonError, jsonSuccess, noStoreHeaders } from "@/lib/api";
import { assertStateChangeAllowed, logAuditEvent } from "@/lib/ops";

export async function POST(request) {
  try {
    await assertStateChangeAllowed(request, "auth.logout", { limit: 30, windowMs: 10 * 60_000 });
    await logoutFromRequest(request);
    await logAuditEvent("auth.logout");
    const response = jsonSuccess({}, { headers: noStoreHeaders() });
    clearSessionCookie(response);
    return response;
  } catch (error) {
    return jsonError(error, { code: "AUTH_LOGOUT_FAILED" });
  }
}
