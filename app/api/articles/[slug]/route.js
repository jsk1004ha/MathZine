import { getUserFromRequest } from "@/lib/auth";
import { updateArticle } from "@/lib/content";
import { jsonError, jsonSuccess } from "@/lib/api";
import { assertStateChangeAllowed, logAuditEvent } from "@/lib/ops";
import { sanitizeText, withErrorCode } from "@/lib/security";

export async function PATCH(request, { params }) {
  try {
    await assertStateChangeAllowed(request, "articles.update", { limit: 60, windowMs: 60 * 60_000 });
    const user = await getUserFromRequest(request);

    if (!user) {
      throw withErrorCode(new Error("로그인이 필요합니다."), "AUTH_REQUIRED", 401);
    }

    const { slug } = await params;
    const safeSlug = sanitizeText(decodeURIComponent(slug), { maxLength: 120 });
    const body = await request.json();
    const article = await updateArticle(safeSlug, body, user);

    await logAuditEvent("article.updated", {
      userId: user.id,
      articleId: article.id,
      articleSlug: article.slug,
      issueSlug: sanitizeText(article.issueSlug, { maxLength: 80 })
    });

    return jsonSuccess({ article });
  } catch (error) {
    return jsonError(error, { code: "ARTICLE_UPDATE_FAILED" });
  }
}
