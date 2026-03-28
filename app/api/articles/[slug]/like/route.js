import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { toggleArticleLike } from "@/lib/content";

export async function POST(request, { params }) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  try {
    const { slug } = await params;
    const payload = await toggleArticleLike(slug, user.id);
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

