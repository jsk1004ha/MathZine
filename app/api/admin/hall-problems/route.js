import { NextResponse } from "next/server";
import { canManageAdmin, getUserFromRequest } from "@/lib/auth";
import { createHallProblem } from "@/lib/content";
import { assertSameOrigin } from "@/lib/security";

export async function POST(request) {
  try {
    assertSameOrigin(request);
    const user = await getUserFromRequest(request);

    if (!canManageAdmin(user)) {
      return NextResponse.json({ error: "어드민 권한이 필요합니다." }, { status: 403 });
    }

    const body = await request.json();
    const problem = await createHallProblem(body);
    return NextResponse.json({ ok: true, problem });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

