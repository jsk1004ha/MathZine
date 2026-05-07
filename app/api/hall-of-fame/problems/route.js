import { canWriteArticles, getUserFromRequest } from "@/lib/auth";
import { createHallProblem } from "@/lib/content";
import { jsonError, jsonSuccess } from "@/lib/api";
import { assertStateChangeAllowed, logAuditEvent } from "@/lib/ops";
import { withErrorCode } from "@/lib/security";

export async function POST(request) {
  try {
    await assertStateChangeAllowed(request, "hall.problem.create", { limit: 30, windowMs: 60 * 60_000 });
    const user = await getUserFromRequest(request);

    if (!canWriteArticles(user)) {
      throw withErrorCode(new Error("문제 생성은 기자 또는 어드민만 가능합니다."), "FORBIDDEN", 403);
    }

    const body = await request.json();
    const problem = await createHallProblem(body, user);
    await logAuditEvent("hall.problem_created", { actorUserId: user.id, problemId: problem.id, articleSlug: problem.articleSlug, type: problem.type });
    return jsonSuccess({ problem }, { status: 201 });
  } catch (error) {
    return jsonError(error, { code: "HALL_PROBLEM_CREATE_FAILED" });
  }
}
