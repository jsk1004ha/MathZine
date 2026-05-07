import { canManageAdmin, getUserFromRequest } from "@/lib/auth";
import { deleteBoardPost } from "@/lib/content";
import { jsonError, jsonSuccess } from "@/lib/api";
import { assertStateChangeAllowed, logAuditEvent } from "@/lib/ops";
import { sanitizeText, withErrorCode } from "@/lib/security";

export async function DELETE(request, { params }) {
  try {
    await assertStateChangeAllowed(request, "admin.board_post.delete", { limit: 30, windowMs: 60 * 60_000 });
    const user = await getUserFromRequest(request);

    if (!canManageAdmin(user)) {
      throw withErrorCode(new Error("어드민 권한이 필요합니다."), "FORBIDDEN", 403);
    }

    const { id } = await params;
    const post = await deleteBoardPost(sanitizeText(decodeURIComponent(id), { maxLength: 120 }));
    await logAuditEvent("admin.board_post_deleted", { actorUserId: user.id, postId: post.id, kind: post.kind });
    return jsonSuccess({ post });
  } catch (error) {
    return jsonError(error, { code: "ADMIN_BOARD_POST_DELETE_FAILED" });
  }
}
