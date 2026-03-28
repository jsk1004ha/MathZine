import { NextResponse } from "next/server";
import { canManageAdmin, createAdminManagedUser, getUserFromRequest } from "@/lib/auth";
import { assertSameOrigin, sanitizeText } from "@/lib/security";

export async function POST(request) {
  try {
    assertSameOrigin(request);
    const user = await getUserFromRequest(request);

    if (!canManageAdmin(user)) {
      return NextResponse.json({ error: "어드민 권한이 필요합니다." }, { status: 403 });
    }

    const body = await request.json();
    const createdUser = await createAdminManagedUser({
      loginId: sanitizeText(body.loginId, { maxLength: 40 }),
      password: sanitizeText(body.password, { maxLength: 80 }),
      nickname: sanitizeText(body.nickname, { maxLength: 24 }),
      name: sanitizeText(body.name, { maxLength: 40 }),
      role: sanitizeText(body.role, { maxLength: 20 }),
      student: sanitizeText(body.student, { maxLength: 60 }),
      studentNumber: sanitizeText(body.studentNumber, { maxLength: 16 }),
      generation: Number(body.generation ?? 0)
    });

    return NextResponse.json({ ok: true, user: createdUser });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
