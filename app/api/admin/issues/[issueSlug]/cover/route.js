import path from "node:path";
import { canManageAdmin, getUserFromRequest } from "@/lib/auth";
import { updateIssueCover } from "@/lib/content";
import { saveUpload } from "@/lib/files";
import { jsonError, jsonSuccess } from "@/lib/api";
import { assertStateChangeAllowed, logAuditEvent } from "@/lib/ops";
import { withErrorCode } from "@/lib/security";

const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];

export async function POST(request, { params }) {
  try {
    await assertStateChangeAllowed(request, "admin.issue.cover", { limit: 20, windowMs: 60 * 60_000 });
    const user = await getUserFromRequest(request);

    if (!canManageAdmin(user)) {
      throw withErrorCode(new Error("어드민 권한이 필요합니다."), "FORBIDDEN", 403);
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      throw withErrorCode(new Error("표지 이미지를 선택해 주세요."), "FILE_REQUIRED", 400);
    }

    const extension = path.extname(file.name).toLowerCase();

    if (!allowedExtensions.includes(extension)) {
      throw withErrorCode(new Error("표지는 jpg, jpeg, png, webp만 지원합니다."), "FILE_TYPE_INVALID", 400);
    }

    const upload = await saveUpload(file, {
      directory: "covers",
      allowedExtensions,
      fallbackExtension: ".jpg",
      maxBytes: 10 * 1024 * 1024
    });

    const { issueSlug } = await params;
    const issue = await updateIssueCover(issueSlug, `/api/media/${upload.storedFileName}`);
    await logAuditEvent("admin.issue_cover_uploaded", {
      actorUserId: user.id,
      issueSlug: issue.issueSlug,
      storedFileName: upload.storedFileName
    });

    return jsonSuccess({
      issue,
      coverImageSrc: issue.coverImageSrc
    });
  } catch (error) {
    return jsonError(error, { code: "ADMIN_ISSUE_COVER_UPLOAD_FAILED" });
  }
}

export async function DELETE(request, { params }) {
  try {
    await assertStateChangeAllowed(request, "admin.issue.cover", { limit: 20, windowMs: 60 * 60_000 });
    const user = await getUserFromRequest(request);

    if (!canManageAdmin(user)) {
      throw withErrorCode(new Error("어드민 권한이 필요합니다."), "FORBIDDEN", 403);
    }

    const { issueSlug } = await params;
    const issue = await updateIssueCover(issueSlug, null);
    await logAuditEvent("admin.issue_cover_cleared", {
      actorUserId: user.id,
      issueSlug: issue.issueSlug
    });

    return jsonSuccess({
      issue,
      coverImageSrc: null
    });
  } catch (error) {
    return jsonError(error, { code: "ADMIN_ISSUE_COVER_CLEAR_FAILED" });
  }
}
