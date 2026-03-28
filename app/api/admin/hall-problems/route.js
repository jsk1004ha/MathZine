import { canManageAdmin, getUserFromRequest } from "@/lib/auth";
import { createHallProblem } from "@/lib/content";
import { jsonError, jsonSuccess } from "@/lib/api";
import { assertStateChangeAllowed, logAuditEvent } from "@/lib/ops";
import { withErrorCode } from "@/lib/security";

export async function POST(request) {
  try {
    await assertStateChangeAllowed(request, "admin.hall_problem.create", { limit: 30, windowMs: 60 * 60_000 });
    const user = await getUserFromRequest(request);

    if (!canManageAdmin(user)) {
      throw withErrorCode(new Error("어드민 권한이 필요합니다."), "FORBIDDEN", 403);
    }

    const body = await request.json();
    const problem = await createHallProblem(body);
    await logAuditEvent("admin.hall_problem_created", { actorUserId: user.id, problemId: problem.id, articleSlug: problem.articleSlug });
    return jsonSuccess({ problem }, { status: 201 });
  } catch (error) {
    return jsonError(error, { code: "ADMIN_HALL_PROBLEM_FAILED" });
  }
}
