import { NextResponse } from "next/server";
import { canManageAdmin, getUserFromRequest } from "@/lib/auth";
import { readUploadedPdf } from "@/lib/files";
import { readCollection } from "@/lib/store";

export async function GET(request, { params }) {
  const user = await getUserFromRequest(request);

  if (!canManageAdmin(user)) {
    return NextResponse.json({ error: "어드민 권한이 필요합니다." }, { status: 403 });
  }

  const { id } = await params;
  const submissions = await readCollection("hallSubmissions");
  const submission = submissions.find((entry) => entry.id === id);

  if (!submission || !submission.storedFileName) {
    return NextResponse.json({ error: "PDF 파일을 찾을 수 없습니다." }, { status: 404 });
  }

  const buffer = await readUploadedPdf(submission.storedFileName);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename=\"${submission.originalFileName}\"`
    }
  });
}
