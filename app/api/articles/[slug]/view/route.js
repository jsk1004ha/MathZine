import { NextResponse } from "next/server";
import { incrementArticleViews } from "@/lib/content";

export async function POST(_request, { params }) {
  try {
    const { slug } = await params;
    const views = await incrementArticleViews(slug);
    return NextResponse.json({ ok: true, views });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
