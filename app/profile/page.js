import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="page-single">
      <section className="profile-card">
        <p className="eyebrow">Profile</p>
        <h1>{user.nickname}</h1>
        <dl className="profile-grid">
          <div>
            <dt>닉네임</dt>
            <dd>{user.nickname}</dd>
          </div>
          <div>
            <dt>이름</dt>
            <dd>{user.name}</dd>
          </div>
          <div>
            <dt>학번</dt>
            <dd>{user.studentNumber || "공개 안 함"}</dd>
          </div>
          <div>
            <dt>로그인 방식</dt>
            <dd>{user.authProvider === "local" ? "직접 생성 계정" : "리로스쿨"}</dd>
          </div>
          <div>
            <dt>권한</dt>
            <dd>{user.role}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
