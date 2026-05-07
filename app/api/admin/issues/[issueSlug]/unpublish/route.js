import { canManageEditorial, getUserFromRequest } from "@/lib/auth";
import { unpublishIssue } from "@/lib/content";
import { jsonError, jsonSuccess } from "@/lib/api";
import { assertStateChangeAllowed, logAuditEvent } from "@/lib/ops";
import { withErrorCode } from "@/lib/security";

export async function POST(request, { params }) {
  try {
    await assertStateChangeAllowed(request, "admin.issue.unpublish", { limit: 12, windowMs: 60 * 60_000 });
    const user = await getUserFromRequest(request);

    if (!canManageEditorial(user)) {
      throw withErrorCode(new Error("편집 관리 권한이 필요합니다."), "FORBIDDEN", 403);
    }

    const { issueSlug } = await params;
    const issue = await unpublishIssue(issueSlug);
    await logAuditEvent("admin.issue_unpublished", { actorUserId: user.id, issueSlug: issue.issueSlug });
    return jsonSuccess({ issue });
  } catch (error) {
    return jsonError(error, { code: "ADMIN_ISSUE_UNPUBLISH_FAILED" });
  }
}
