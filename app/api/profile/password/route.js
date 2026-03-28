import { changeLocalPassword, getUserFromRequest } from "@/lib/auth";
import { jsonError, jsonSuccess } from "@/lib/api";
import { assertStateChangeAllowed } from "@/lib/ops";
import { sanitizeText, withErrorCode } from "@/lib/security";

export async function POST(request) {
  try {
    await assertStateChangeAllowed(request, "profile.password", { limit: 10, windowMs: 60 * 60_000 });
    const user = await getUserFromRequest(request);

    if (!user) {
      throw withErrorCode(new Error("로그인이 필요합니다."), "AUTH_REQUIRED", 401);
    }

    const body = await request.json();
    await changeLocalPassword(
      user.id,
      sanitizeText(body.currentPassword, { maxLength: 80 }),
      sanitizeText(body.newPassword, { maxLength: 80 })
    );

    return jsonSuccess({ message: "비밀번호를 재설정했습니다." });
  } catch (error) {
    return jsonError(error, { code: "PROFILE_PASSWORD_FAILED" });
  }
}
