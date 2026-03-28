import { NextResponse } from "next/server";
import { canManageAdmin, getUserFromRequest } from "@/lib/auth";
import { scoreHallSubmission } from "@/lib/content";
import { assertSameOrigin, sanitizeText } from "@/lib/security";

export async function PATCH(request, { params }) {
  try {
    assertSameOrigin(request);
    const user = await getUserFromRequest(request);

    if (!canManageAdmin(user)) {
      return NextResponse.json({ error: "어드민 권한이 필요합니다." }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const submission = await scoreHallSubmission(
      id,
      Number(body.points ?? 0),
      sanitizeText(body.status, { maxLength: 20 })
    );
    return NextResponse.json({ ok: true, submission });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
