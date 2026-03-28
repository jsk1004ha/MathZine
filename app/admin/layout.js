import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin-panels";
import { canManageAdmin, getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!canManageAdmin(user)) {
    redirect("/");
  }

  return (
    <div className="page-single">
      <section className="section-panel">
        <div className="section-heading">
          <p className="eyebrow">Admin</p>
          <h1>MathZine 운영 화면</h1>
        </div>
        <p>권한, 편집, 명예의 전당 운영을 분리해 처리하도록 어드민 화면을 나눴습니다.</p>
        <AdminNav />
      </section>
      {children}
    </div>
  );
}
