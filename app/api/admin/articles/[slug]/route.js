import { canManageEditorial, getUserFromRequest } from "@/lib/auth";
import { deleteArticle } from "@/lib/content";
import { jsonError, jsonSuccess } from "@/lib/api";
import { assertStateChangeAllowed, logAuditEvent } from "@/lib/ops";
import { sanitizeText, withErrorCode } from "@/lib/security";

export async function DELETE(request, { params }) {
  try {
    await assertStateChangeAllowed(request, "admin.article.delete", { limit: 20, windowMs: 60 * 60_000 });
    const user = await getUserFromRequest(request);

    if (!canManageEditorial(user)) {
      throw withErrorCode(new Error("편집 관리 권한이 필요합니다."), "FORBIDDEN", 403);
    }

    const { slug } = await params;
    const result = await deleteArticle(sanitizeText(decodeURIComponent(slug), { maxLength: 120 }));
    await logAuditEvent("admin.article_deleted", {
      actorUserId: user.id,
      articleSlug: result.article.slug,
      removedCommentCount: result.removedCommentCount,
      detachedProblemCount: result.detachedProblemCount
    });

    return jsonSuccess({ result });
  } catch (error) {
    return jsonError(error, { code: "ADMIN_ARTICLE_DELETE_FAILED" });
  }
}
