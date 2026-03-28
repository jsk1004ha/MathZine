import { NextResponse } from "next/server";
import { canPostBoard, getUserFromRequest } from "@/lib/auth";
import { createBoardPost, listBoardPosts } from "@/lib/content";
import { assertSameOrigin } from "@/lib/security";

export async function GET() {
  const posts = await listBoardPosts();
  return NextResponse.json({ posts });
}

export async function POST(request) {
  try {
    assertSameOrigin(request);
    const user = await getUserFromRequest(request);

    if (!canPostBoard(user)) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const body = await request.json();
    const post = await createBoardPost(body, user);
    return NextResponse.json({ ok: true, post });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

