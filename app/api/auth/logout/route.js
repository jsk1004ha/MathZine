import { NextResponse } from "next/server";
import { clearSessionCookie, logoutFromRequest } from "@/lib/auth";

export async function POST(request) {
  await logoutFromRequest(request);
  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}

