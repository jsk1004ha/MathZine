import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

export default function LoginPage() {
  return (
    <div className="auth-layout">
      <section className="auth-copy">
        <p className="eyebrow">Login</p>
        <h1 className="auth-title">MathZine 로그인</h1>
        <p className="auth-copy-lead">
          학생은 리로스쿨 계정으로 로그인합니다. 기사 읽기는 로그인 없이 가능하며, 댓글과 좋아요, 게시판,
          명예의 전당 참여는 로그인 후 사용할 수 있습니다.
        </p>
        <p className="auth-copy-foot">
          아직 계정이 없다면 <Link href="/signup">회원가입</Link>으로 이동하세요.
        </p>
      </section>
      <section className="auth-panel">
        <AuthForm mode="login" />
      </section>
    </div>
  );
}
