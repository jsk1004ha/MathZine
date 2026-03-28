import { getUserFromRequest } from "@/lib/auth";
import { createHallSubmission, listHallSubmissions } from "@/lib/content";
import { saveSubmissionUpload } from "@/lib/files";
import { jsonError, jsonSuccess, noStoreHeaders } from "@/lib/api";
import { assertStateChangeAllowed, logAuditEvent } from "@/lib/ops";
import { withErrorCode } from "@/lib/security";

export async function GET() {
  const submissions = await listHallSubmissions();
  return jsonSuccess({ submissions }, { headers: noStoreHeaders() });
}

export async function POST(request) {
  try {
    await assertStateChangeAllowed(request, "hall.submission", { limit: 12, windowMs: 24 * 60 * 60_000 });
    const user = await getUserFromRequest(request);

    if (!user) {
      throw withErrorCode(new Error("로그인이 필요합니다."), "AUTH_REQUIRED", 401);
    }

    const formData = await request.formData();
    const problemId = String(formData.get("problemId") ?? "");
    const file = formData.get("file");

    if (!(file instanceof File)) {
      throw withErrorCode(new Error("제출 파일을 업로드해 주세요."), "FILE_REQUIRED", 400);
    }

    const lowerName = file.name.toLowerCase();
    const isPdf = file.type === "application/pdf" || lowerName.endsWith(".pdf");
    const isImage = file.type.startsWith("image/") || [".png", ".jpg", ".jpeg", ".webp"].some((extension) => lowerName.endsWith(extension));

    if (!isPdf && !isImage) {
      throw withErrorCode(new Error("PDF 또는 이미지 형식만 업로드할 수 있습니다."), "FILE_TYPE_INVALID", 400);
    }

    const upload = await saveSubmissionUpload(file);
    const submission = await createHallSubmission(
      {
        problemId,
        ...upload
      },
      user
    );

    await logAuditEvent("hall.submission.created", {
      userId: user.id,
      submissionId: submission.id,
      problemId: submission.problemId,
      fileKind: submission.fileKind
    });
    return jsonSuccess({ submission }, { status: 201 });
  } catch (error) {
    return jsonError(error, { code: "HALL_SUBMISSION_FAILED" });
  }
}
