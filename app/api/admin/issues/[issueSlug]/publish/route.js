import { NextResponse } from "next/server";
import { canManageAdmin, getUserFromRequest } from "@/lib/auth";
import { publishIssue } from "@/lib/content";
import { assertSameOrigin } from "@/lib/security";

export async function POST(request, { params }) {
  try {
    assertSameOrigin(request);
    const user = await getUserFromRequest(request);

    if (!canManageAdmin(user)) {
      return NextResponse.json({ error: "어드민 권한이 필요합니다." }, { status: 403 });
    }

    const { issueSlug } = await params;
    const issue = await publishIssue(issueSlug);
    return NextResponse.json({ ok: true, issue });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
