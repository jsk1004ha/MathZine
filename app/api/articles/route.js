import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { createArticle, listArticles } from "@/lib/content";
import { assertSameOrigin } from "@/lib/security";

export async function GET() {
  const articles = await listArticles();
  return NextResponse.json({ articles });
}

export async function POST(request) {
  try {
    assertSameOrigin(request);
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const body = await request.json();
    const article = await createArticle(body, user);
    return NextResponse.json({ ok: true, article });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

