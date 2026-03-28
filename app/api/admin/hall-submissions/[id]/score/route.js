import { canManageAdmin, getUserFromRequest } from "@/lib/auth";
import { scoreHallSubmission } from "@/lib/content";
import { jsonError, jsonSuccess } from "@/lib/api";
import { assertStateChangeAllowed, logAuditEvent } from "@/lib/ops";
import { sanitizeText, withErrorCode } from "@/lib/security";

export async function PATCH(request, { params }) {
  try {
    await assertStateChangeAllowed(request, "admin.hall_submission.score", { limit: 50, windowMs: 60 * 60_000 });
    const user = await getUserFromRequest(request);

    if (!canManageAdmin(user)) {
      throw withErrorCode(new Error("어드민 권한이 필요합니다."), "FORBIDDEN", 403);
    }

    const { id } = await params;
    const body = await request.json();
    const submission = await scoreHallSubmission(
      id,
      Number(body.points ?? 0),
      sanitizeText(body.status, { maxLength: 20 })
    );
    await logAuditEvent("admin.hall_submission_scored", { actorUserId: user.id, submissionId: id, status: submission.status, points: submission.awardedPoints });
    return jsonSuccess({ submission });
  } catch (error) {
    return jsonError(error, { code: "ADMIN_HALL_SCORE_FAILED" });
  }
}
