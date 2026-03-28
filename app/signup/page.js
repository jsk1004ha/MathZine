import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

export default function SignupPage() {
  return (
    <div className="auth-layout">
      <section className="auth-copy">
        <p className="eyebrow">Signup</p>
        <h1 className="auth-title">MathZine 회원가입</h1>
        <p className="auth-copy-lead">
          리로스쿨 인증 후 가입하고 사용할 닉네임을 정하세요. 닉네임은 댓글, 게시판, 명예의 전당 랭킹에
          표시됩니다.
        </p>
        <p className="auth-copy-foot">
          이미 가입했다면 <Link href="/login">로그인</Link>으로 이동하세요.
        </p>
      </section>
      <section className="auth-panel">
        <AuthForm mode="signup" />
      </section>
    </div>
  );
}
