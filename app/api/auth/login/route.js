import { NextResponse } from "next/server";
import { applySessionCookie, loginUser } from "@/lib/auth";
import { assertSameOrigin, sanitizeText } from "@/lib/security";

export async function POST(request) {
  try {
    assertSameOrigin(request);
    const body = await request.json();
    const { user, sessionToken, rememberMe } = await loginUser(
      sanitizeText(body.riroId, { maxLength: 40 }),
      sanitizeText(body.password, { maxLength: 80 }),
      { rememberMe: body.rememberMe }
    );

    const response = NextResponse.json({ ok: true, user });
    applySessionCookie(response, sessionToken, rememberMe);
    return response;
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
