import { canManageAdmin, getUserFromRequest, updateUserRole } from "@/lib/auth";
import { jsonError, jsonSuccess } from "@/lib/api";
import { assertStateChangeAllowed, logAuditEvent } from "@/lib/ops";
import { sanitizeText, withErrorCode } from "@/lib/security";

export async function PATCH(request, { params }) {
  try {
    await assertStateChangeAllowed(request, "admin.users.role", { limit: 30, windowMs: 60 * 60_000 });
    const user = await getUserFromRequest(request);

    if (!canManageAdmin(user)) {
      throw withErrorCode(new Error("어드민 권한이 필요합니다."), "FORBIDDEN", 403);
    }

    const { id } = await params;
    const body = await request.json();
    const updatedUser = await updateUserRole(id, sanitizeText(body.role, { maxLength: 20 }));
    await logAuditEvent("admin.user_role_updated", { actorUserId: user.id, targetUserId: id, role: updatedUser.role });
    return jsonSuccess({ user: updatedUser });
  } catch (error) {
    return jsonError(error, { code: "ADMIN_USER_ROLE_FAILED" });
  }
}
