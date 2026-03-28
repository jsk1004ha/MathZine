import { NextResponse } from "next/server";
import { applySessionCookie, signUpWithRiro } from "@/lib/auth";
import { assertSameOrigin, sanitizeText } from "@/lib/security";

export async function POST(request) {
  try {
    assertSameOrigin(request);
    const body = await request.json();

    if (!body.acceptedTerms) {
      return NextResponse.json({ error: "약관 동의가 필요합니다." }, { status: 400 });
    }

    const { user, sessionToken, rememberMe } = await signUpWithRiro(
      sanitizeText(body.riroId, { maxLength: 30 }),
      sanitizeText(body.password, { maxLength: 80 }),
      sanitizeText(body.nickname, { maxLength: 24 }),
      { rememberMe: body.rememberMe }
    );

    const response = NextResponse.json({ ok: true, user });
    applySessionCookie(response, sessionToken, rememberMe);
    return response;
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
