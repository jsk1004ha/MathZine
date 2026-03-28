import { canPostBoard, getUserFromRequest } from "@/lib/auth";
import { createBoardPost, listBoardPosts } from "@/lib/content";
import { jsonError, jsonSuccess, paginateItems, parsePagination } from "@/lib/api";
import { assertStateChangeAllowed, logAuditEvent } from "@/lib/ops";
import { withErrorCode } from "@/lib/security";

export async function GET(request) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const pagination = parsePagination(searchParams, { pageSize: 10 });
    const posts = await listBoardPosts({
      searchTerm: searchParams.get("q") ?? "",
      kind: searchParams.get("kind") ?? "",
      sort: searchParams.get("sort") ?? "latest"
    });
    const paged = paginateItems(posts, pagination);
    return jsonSuccess({ posts: paged.items }, { meta: paged.meta });
  } catch (error) {
    return jsonError(error, { code: "BOARD_LIST_FAILED" });
  }
}

export async function POST(request) {
  try {
    await assertStateChangeAllowed(request, "board.create", { limit: 12, windowMs: 60 * 60_000 });
    const user = await getUserFromRequest(request);

    if (!canPostBoard(user)) {
      throw withErrorCode(new Error("로그인이 필요합니다."), "AUTH_REQUIRED", 401);
    }

    const body = await request.json();
    const post = await createBoardPost(body, user);
    await logAuditEvent("board.created", { userId: user.id, postId: post.id, kind: post.kind });
    return jsonSuccess({ post }, { status: 201 });
  } catch (error) {
    return jsonError(error, { code: "BOARD_CREATE_FAILED" });
  }
}
