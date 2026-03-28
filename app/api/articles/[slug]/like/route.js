import { assertUserNotBanned, getUserFromRequest } from "@/lib/auth";
import { toggleArticleLike } from "@/lib/content";
import { jsonError, jsonSuccess } from "@/lib/api";
import { assertStateChangeAllowed, logAuditEvent } from "@/lib/ops";
import { withErrorCode } from "@/lib/security";

export async function POST(request, { params }) {
  try {
    await assertStateChangeAllowed(request, "articles.like", { limit: 60, windowMs: 60 * 60_000 });
    const user = await getUserFromRequest(request);

    if (!user) {
      throw withErrorCode(new Error("로그인이 필요합니다."), "AUTH_REQUIRED", 401);
    }

    assertUserNotBanned(user);
    const { slug } = await params;
    const payload = await toggleArticleLike(slug, user.id);
    await logAuditEvent("article.like_toggled", { userId: user.id, articleSlug: slug, liked: payload.liked });
    return jsonSuccess(payload);
  } catch (error) {
    return jsonError(error, { code: "ARTICLE_LIKE_FAILED" });
  }
}
