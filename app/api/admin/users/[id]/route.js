import { canManageAdmin, deleteUserAccount, getUserFromRequest } from "@/lib/auth";
import { jsonError, jsonSuccess } from "@/lib/api";
import { assertStateChangeAllowed, logAuditEvent } from "@/lib/ops";
import { withErrorCode } from "@/lib/security";

export async function DELETE(request, { params }) {
  try {
    await assertStateChangeAllowed(request, "admin.users.delete", { limit: 12, windowMs: 60 * 60_000 });
    const user = await getUserFromRequest(request);

    if (!canManageAdmin(user)) {
      throw withErrorCode(new Error("어드민 권한이 필요합니다."), "FORBIDDEN", 403);
    }

    const { id } = await params;
    const deletedUser = await deleteUserAccount(id, user.id);
    await logAuditEvent("admin.user_deleted", { actorUserId: user.id, targetUserId: id, role: deletedUser.role });
    return jsonSuccess({ user: deletedUser });
  } catch (error) {
    return jsonError(error, { code: "ADMIN_USER_DELETE_FAILED" });
  }
}
