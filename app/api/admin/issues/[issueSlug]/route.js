import { canManageEditorial, getUserFromRequest } from "@/lib/auth";
import { deleteIssue } from "@/lib/content";
import { jsonError, jsonSuccess } from "@/lib/api";
import { assertStateChangeAllowed, logAuditEvent } from "@/lib/ops";
import { sanitizeText, withErrorCode } from "@/lib/security";

export async function DELETE(request, { params }) {
  try {
    await assertStateChangeAllowed(request, "admin.issue.delete", { limit: 20, windowMs: 60 * 60_000 });
    const user = await getUserFromRequest(request);

    if (!canManageEditorial(user)) {
      throw withErrorCode(new Error("편집 관리 권한이 필요합니다."), "FORBIDDEN", 403);
    }

    const { issueSlug } = await params;
    const safeIssueSlug = sanitizeText(decodeURIComponent(issueSlug), { maxLength: 80 });
    const issue = await deleteIssue(safeIssueSlug);
    await logAuditEvent("admin.issue_deleted", {
      actorUserId: user.id,
      issueSlug: issue.issueSlug,
      issue: issue.issue,
      hadCoverImage: Boolean(issue.coverImageSrc)
    });

    return jsonSuccess({ issue });
  } catch (error) {
    return jsonError(error, { code: "ADMIN_ISSUE_DELETE_FAILED" });
  }
}
