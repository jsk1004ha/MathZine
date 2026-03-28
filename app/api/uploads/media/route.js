import path from "node:path";
import { NextResponse } from "next/server";
import { canWriteArticles, getUserFromRequest } from "@/lib/auth";
import { saveUpload } from "@/lib/files";
import { assertSameOrigin } from "@/lib/security";

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
    assertSameOrigin(request);
    const user = await getUserFromRequest(request);

    if (!canWriteArticles(user)) {
      return NextResponse.json({ error: "기사 작성 권한이 필요합니다." }, { status: 403 });
    }

    const formData = await request.formData();
    const kind = String(formData.get("kind") ?? "image");
    const file = formData.get("file");
    const config = mediaTypes[kind];

    if (!config) {
      return NextResponse.json({ error: "허용되지 않은 업로드 종류입니다." }, { status: 400 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "업로드할 파일을 선택해 주세요." }, { status: 400 });
    }

    const extension = path.extname(file.name).toLowerCase();

    if (!config.extensions.includes(extension)) {
      return NextResponse.json({ error: "허용되지 않은 파일 형식입니다." }, { status: 400 });
    }

    const upload = await saveUpload(file, {
      directory: config.directory,
      allowedExtensions: config.extensions,
      fallbackExtension: config.extensions[0]
    });

    return NextResponse.json({
      ok: true,
      url: `/api/media/${upload.storedFileName}`,
      upload
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
