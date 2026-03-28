import { NextResponse } from "next/server";
import { canManageAdmin, getUserFromRequest, updateUserRole } from "@/lib/auth";
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
    const updatedUser = await updateUserRole(id, sanitizeText(body.role, { maxLength: 20 }));
    return NextResponse.json({ ok: true, user: updatedUser });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

