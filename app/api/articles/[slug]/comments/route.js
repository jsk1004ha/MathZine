import { getUserFromRequest } from "@/lib/auth";
import { addComment, listCommentsForArticle } from "@/lib/content";
import { jsonError, jsonSuccess, noStoreHeaders } from "@/lib/api";
import { assertStateChangeAllowed, logAuditEvent } from "@/lib/ops";
import { sanitizeText, withErrorCode } from "@/lib/security";

export async function GET(_request, { params }) {
  const { slug } = await params;
  const comments = await listCommentsForArticle(slug);
  return jsonSuccess({ comments }, { headers: noStoreHeaders() });
}

export async function POST(request, { params }) {
  try {
    await assertStateChangeAllowed(request, "comments.create", { limit: 20, windowMs: 60 * 60_000 });
    const user = await getUserFromRequest(request);

    if (!user) {
      throw withErrorCode(new Error("로그인이 필요합니다."), "AUTH_REQUIRED", 401);
    }

    const { slug } = await params;
    const body = await request.json();
    const comment = await addComment(
      slug,
      user,
      sanitizeText(body.body, { maxLength: 500, multiline: true })
    );
    await logAuditEvent("comment.created", { userId: user.id, articleSlug: slug, commentId: comment.id });
    return jsonSuccess({ comment }, { status: 201 });
  } catch (error) {
    return jsonError(error, { code: "COMMENT_CREATE_FAILED" });
  }
}
