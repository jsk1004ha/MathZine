import { incrementArticleViews } from "@/lib/content";
import { jsonError, jsonSuccess } from "@/lib/api";
import { assertStateChangeAllowed } from "@/lib/ops";

export async function POST(request, { params }) {
  try {
    const { slug } = await params;
    await assertStateChangeAllowed(request, "articles.view", {
      limit: 5,
      windowMs: 60 * 60_000,
      key: `${slug}:${request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "local"}`
    });
    const views = await incrementArticleViews(slug);
    return jsonSuccess({ views });
  } catch (error) {
    return jsonError(error, { code: "ARTICLE_VIEW_FAILED" });
  }
}
