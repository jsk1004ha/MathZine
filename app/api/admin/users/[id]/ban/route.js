import { canManageAdmin, getUserFromRequest, updateUserBanStatus } from "@/lib/auth";
import { jsonError, jsonSuccess } from "@/lib/api";
import { assertStateChangeAllowed, logAuditEvent } from "@/lib/ops";
import { sanitizeText, withErrorCode } from "@/lib/security";

export async function PATCH(request, { params }) {
  try {
    await assertStateChangeAllowed(request, "admin.users.ban", { limit: 30, windowMs: 60 * 60_000 });
    const user = await getUserFromRequest(request);

    if (!canManageAdmin(user)) {
      throw withErrorCode(new Error("어드민 권한이 필요합니다."), "FORBIDDEN", 403);
    }

    const { id } = await params;
    const body = await request.json();
    const nextUser = await updateUserBanStatus(
      id,
      sanitizeText(body.status, { maxLength: 20 }),
      sanitizeText(body.reason, { maxLength: 200, multiline: true }),
      user.id
    );

    await logAuditEvent("admin.user_ban_updated", {
      actorUserId: user.id,
      targetUserId: id,
      status: nextUser.status
    });

    return jsonSuccess({ user: nextUser });
  } catch (error) {
    return jsonError(error, { code: "ADMIN_USER_BAN_FAILED" });
  }
}
