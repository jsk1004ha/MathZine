import { adminResetLocalPassword, canManageAdmin, getUserFromRequest } from "@/lib/auth";
import { jsonError, jsonSuccess } from "@/lib/api";
import { assertStateChangeAllowed, logAuditEvent } from "@/lib/ops";
import { sanitizeText, withErrorCode } from "@/lib/security";

export async function PATCH(request, { params }) {
  try {
    await assertStateChangeAllowed(request, "admin.users.password", { limit: 20, windowMs: 60 * 60_000 });
    const user = await getUserFromRequest(request);

    if (!canManageAdmin(user)) {
      throw withErrorCode(new Error("어드민 권한이 필요합니다."), "FORBIDDEN", 403);
    }

    const { id } = await params;
    const body = await request.json();
    const targetUser = await adminResetLocalPassword(id, sanitizeText(body.password, { maxLength: 80 }));

    await logAuditEvent("admin.user_password_reset", {
      actorUserId: user.id,
      targetUserId: id
    });

    return jsonSuccess({ user: targetUser });
  } catch (error) {
    return jsonError(error, { code: "ADMIN_USER_PASSWORD_FAILED" });
  }
}
