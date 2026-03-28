import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { addComment, listCommentsForArticle } from "@/lib/content";
import { assertSameOrigin, sanitizeText } from "@/lib/security";

export async function GET(_request, { params }) {
  const { slug } = await params;
  const comments = await listCommentsForArticle(slug);
  return NextResponse.json({ comments });
}

export async function POST(request, { params }) {
  try {
    assertSameOrigin(request);
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const { slug } = await params;
    const body = await request.json();
    const comment = await addComment(
      slug,
      user,
      sanitizeText(body.body, { maxLength: 500, multiline: true })
    );
    return NextResponse.json({ ok: true, comment });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

