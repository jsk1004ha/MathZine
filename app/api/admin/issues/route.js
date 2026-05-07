import { canManageEditorial, getUserFromRequest } from "@/lib/auth";
import { createIssue } from "@/lib/content";
import { jsonError, jsonSuccess } from "@/lib/api";
import { assertStateChangeAllowed, logAuditEvent } from "@/lib/ops";
import { sanitizeText, withErrorCode } from "@/lib/security";

export async function POST(request) {
  try {
    await assertStateChangeAllowed(request, "admin.issue.create", { limit: 20, windowMs: 60 * 60_000 });
    const user = await getUserFromRequest(request);

    if (!canManageEditorial(user)) {
      throw withErrorCode(new Error("편집 관리 권한이 필요합니다."), "FORBIDDEN", 403);
    }

    const body = await request.json();
    const issue = await createIssue({
      issue: sanitizeText(body.issue, { maxLength: 80 }),
      issueSlug: sanitizeText(body.issueSlug, { maxLength: 80 })
    });

    await logAuditEvent("admin.issue_created", { actorUserId: user.id, issueSlug: issue.issueSlug });
    return jsonSuccess({ issue }, { status: 201 });
  } catch (error) {
    return jsonError(error, { code: "ADMIN_ISSUE_CREATE_FAILED" });
  }
}
