import { canManageAdmin, getUserFromRequest } from "@/lib/auth";
import { publishIssue } from "@/lib/content";
import { jsonError, jsonSuccess } from "@/lib/api";
import { assertStateChangeAllowed, logAuditEvent } from "@/lib/ops";
import { withErrorCode } from "@/lib/security";

export async function POST(request, { params }) {
  try {
    await assertStateChangeAllowed(request, "admin.issue.publish", { limit: 12, windowMs: 60 * 60_000 });
    const user = await getUserFromRequest(request);

    if (!canManageAdmin(user)) {
      throw withErrorCode(new Error("어드민 권한이 필요합니다."), "FORBIDDEN", 403);
    }

    const { issueSlug } = await params;
    const issue = await publishIssue(issueSlug);
    await logAuditEvent("admin.issue_published", { actorUserId: user.id, issueSlug: issue.issueSlug });
    return jsonSuccess({ issue });
  } catch (error) {
    return jsonError(error, { code: "ADMIN_ISSUE_PUBLISH_FAILED" });
  }
}
