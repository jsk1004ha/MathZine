import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { createHallSubmission, listHallSubmissions } from "@/lib/content";
import { savePdfUpload } from "@/lib/files";

export async function GET() {
  const submissions = await listHallSubmissions();
  return NextResponse.json({ submissions });
}

export async function POST(request) {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const formData = await request.formData();
    const problemId = String(formData.get("problemId") ?? "");
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "PDF 파일을 업로드해 주세요." }, { status: 400 });
    }

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "PDF 형식만 업로드할 수 있습니다." }, { status: 400 });
    }

    const upload = await savePdfUpload(file);
    const submission = await createHallSubmission(
      {
        problemId,
        ...upload
      },
      user
    );

    return NextResponse.json({ ok: true, submission });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
