import { NextResponse } from "next/server";
import { canManageAdmin, getUserFromRequest } from "@/lib/auth";
import { jsonError } from "@/lib/api";
import { getMimeType, readUploadedFile } from "@/lib/files";
import { readCollection } from "@/lib/store";

export async function GET(request, { params }) {
  const user = await getUserFromRequest(request);

  if (!canManageAdmin(user)) {
    return jsonError(Object.assign(new Error("어드민 권한이 필요합니다."), { status: 403, code: "FORBIDDEN" }));
  }

  const { id } = await params;
  const submissions = await readCollection("hallSubmissions");
  const submission = submissions.find((entry) => entry.id === id);

  if (!submission || !submission.storedFileName) {
    return jsonError(Object.assign(new Error("첨부 파일을 찾을 수 없습니다."), { status: 404, code: "FILE_NOT_FOUND" }));
  }

  const buffer = await readUploadedFile(submission.storedFileName);
  const mimeType = submission.mimeType || getMimeType(submission.originalFileName);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": mimeType,
      "Content-Disposition": `inline; filename=\"${submission.originalFileName}\"`,
      "Cache-Control": "no-store"
    }
  });
}
