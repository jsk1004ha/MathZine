import path from "node:path";
import { canWriteArticles, getUserFromRequest } from "@/lib/auth";
import { saveUpload } from "@/lib/files";
import { jsonError, jsonSuccess } from "@/lib/api";
import { assertStateChangeAllowed, logAuditEvent } from "@/lib/ops";
import { withErrorCode } from "@/lib/security";

const mediaTypes = {
  image: {
    directory: "media",
    extensions: [".jpg", ".jpeg", ".png", ".gif", ".webp"]
  },
  video: {
    directory: "media",
    extensions: [".mp4", ".webm", ".ogg"]
  }
};

export async function POST(request) {
  try {
    await assertStateChangeAllowed(request, "media.upload", { limit: 30, windowMs: 60 * 60_000 });
    const user = await getUserFromRequest(request);

    if (!canWriteArticles(user)) {
      throw withErrorCode(new Error("기사 작성 권한이 필요합니다."), "FORBIDDEN", 403);
    }

    const formData = await request.formData();
    const kind = String(formData.get("kind") ?? "image");
    const file = formData.get("file");
    const config = mediaTypes[kind];

    if (!config) {
      throw withErrorCode(new Error("허용되지 않은 업로드 종류입니다."), "UPLOAD_KIND_INVALID", 400);
    }

    if (!(file instanceof File)) {
      throw withErrorCode(new Error("업로드할 파일을 선택해 주세요."), "FILE_REQUIRED", 400);
    }

    const extension = path.extname(file.name).toLowerCase();

    if (!config.extensions.includes(extension)) {
      throw withErrorCode(new Error("허용되지 않은 파일 형식입니다."), "FILE_TYPE_INVALID", 400);
    }

    const upload = await saveUpload(file, {
      directory: config.directory,
      allowedExtensions: config.extensions,
      fallbackExtension: config.extensions[0],
      maxBytes: kind === "video" ? 40 * 1024 * 1024 : 10 * 1024 * 1024
    });

    await logAuditEvent("media.uploaded", {
      userId: user.id,
      kind,
      storedFileName: upload.storedFileName
    });
    return jsonSuccess({
      url: `/api/media/${upload.storedFileName}`,
      upload
    });
  } catch (error) {
    return jsonError(error, { code: "MEDIA_UPLOAD_FAILED" });
  }
}
