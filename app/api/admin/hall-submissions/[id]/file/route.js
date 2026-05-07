import { NextResponse } from "next/server";
import { canGradeHallProblem, getUserFromRequest } from "@/lib/auth";
import { jsonError } from "@/lib/api";
import { getMimeType, readUploadedFile } from "@/lib/files";
import { readCollection } from "@/lib/store";

export async function GET(request, { params }) {
  const user = await getUserFromRequest(request);

  const { id } = await params;
  const [submissions, problems] = await Promise.all([readCollection("hallSubmissions"), readCollection("hallProblems")]);
  const submission = submissions.find((entry) => entry.id === id);

  if (!submission || !submission.storedFileName) {
    return jsonError(Object.assign(new Error("첨부 파일을 찾을 수 없습니다."), { status: 404, code: "FILE_NOT_FOUND" }));
  }

  const problem = problems.find((entry) => entry.id === submission.problemId);

  if (!canGradeHallProblem(user, problem)) {
    return jsonError(Object.assign(new Error("채점 권한이 필요합니다."), { status: 403, code: "FORBIDDEN" }));
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
