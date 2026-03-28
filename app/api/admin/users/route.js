import { canManageAdmin, createAdminManagedUser, getUserFromRequest } from "@/lib/auth";
import { jsonError, jsonSuccess } from "@/lib/api";
import { assertStateChangeAllowed, logAuditEvent } from "@/lib/ops";
import { sanitizeText, withErrorCode } from "@/lib/security";

export async function POST(request) {
  try {
    await assertStateChangeAllowed(request, "admin.users.create", { limit: 20, windowMs: 60 * 60_000 });
    const user = await getUserFromRequest(request);

    if (!canManageAdmin(user)) {
      throw withErrorCode(new Error("어드민 권한이 필요합니다."), "FORBIDDEN", 403);
    }

    const body = await request.json();
    const createdUser = await createAdminManagedUser({
      loginId: sanitizeText(body.loginId, { maxLength: 40 }),
      password: sanitizeText(body.password, { maxLength: 80 }),
      nickname: sanitizeText(body.nickname, { maxLength: 24 }),
      name: sanitizeText(body.name, { maxLength: 40 }),
      role: sanitizeText(body.role, { maxLength: 20 }),
      student: sanitizeText(body.student, { maxLength: 60 }),
      studentNumber: sanitizeText(body.studentNumber, { maxLength: 16 }),
      generation: Number(body.generation ?? 0)
    });

    await logAuditEvent("admin.user_created", { actorUserId: user.id, targetUserId: createdUser.id, role: createdUser.role });
    return jsonSuccess({ user: createdUser }, { status: 201 });
  } catch (error) {
    return jsonError(error, { code: "ADMIN_USER_CREATE_FAILED" });
  }
}
