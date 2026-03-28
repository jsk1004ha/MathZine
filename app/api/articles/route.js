import { getUserFromRequest } from "@/lib/auth";
import { createArticle, listArticles } from "@/lib/content";
import { jsonError, jsonSuccess, paginateItems, parsePagination } from "@/lib/api";
import { assertStateChangeAllowed, logAuditEvent } from "@/lib/ops";
import { sanitizeText, withErrorCode } from "@/lib/security";

export async function GET(request) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const pagination = parsePagination(searchParams, { pageSize: 12 });
    const articles = await listArticles({
      searchTerm: searchParams.get("q") ?? "",
      section: searchParams.get("section") ?? "",
      issue: searchParams.get("issue") ?? "",
      sort: searchParams.get("sort") ?? "latest"
    });
    const paged = paginateItems(articles, pagination);
    return jsonSuccess({ articles: paged.items }, { meta: paged.meta });
  } catch (error) {
    return jsonError(error, { code: "ARTICLES_LIST_FAILED" });
  }
}

export async function POST(request) {
  try {
    await assertStateChangeAllowed(request, "articles.create", { limit: 8, windowMs: 60 * 60_000 });
    const user = await getUserFromRequest(request);

    if (!user) {
      throw withErrorCode(new Error("로그인이 필요합니다."), "AUTH_REQUIRED", 401);
    }

    const body = await request.json();
    const article = await createArticle(body, user);
    await logAuditEvent("article.submitted", {
      userId: user.id,
      articleId: article.id,
      issueSlug: sanitizeText(article.issueSlug, { maxLength: 80 })
    });
    return jsonSuccess({ article }, { status: 201 });
  } catch (error) {
    return jsonError(error, { code: "ARTICLE_CREATE_FAILED" });
  }
}
