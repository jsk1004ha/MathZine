import Link from "next/link";
import { AccountMenu } from "@/components/account-menu";
import { SiteSidebar } from "@/components/site-sidebar";

function formatToday() {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long"
  }).format(new Date());
}

export function Header({ user }) {
  const canWrite = user && (user.role === "admin" || user.role === "reporter");

  return (
    <header className="site-header mz-site-header">
      <div className="mz-masthead-bar">
        <SiteSidebar
          canWrite={Boolean(canWrite)}
          isAdmin={user?.role === "admin"}
          isTeacher={user?.role === "teacher"}
          user={user ? { nickname: user.nickname } : null}
        />
        <Link className="masthead-logo mz-wordmark" href="/">
          MathZine
        </Link>
        <div className="mz-header-actions">
          <Link className="mz-icon-button" href="/search" aria-label="검색" title="검색">
            <svg aria-hidden="true" fill="none" height="22" viewBox="0 0 24 24" width="22">
              <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.7" />
              <path d="M16 16l4.5 4.5" stroke="currentColor" strokeLinecap="square" strokeWidth="1.7" />
            </svg>
          </Link>
          <Link className="mz-icon-button" href={canWrite ? "/studio" : "/hall-of-fame"} aria-label={canWrite ? "기사 작성" : "문제 풀기"}>
            <svg aria-hidden="true" fill="none" height="22" viewBox="0 0 24 24" width="22">
              <path d="M4.5 19.5h4.2L19.2 9 15 4.8 4.5 15.3v4.2Z" stroke="currentColor" strokeLinejoin="miter" strokeWidth="1.7" />
              <path d="m13.8 6 4.2 4.2" stroke="currentColor" strokeLinecap="square" strokeWidth="1.7" />
            </svg>
          </Link>
          <Link className="mz-icon-button" href={user ? "/profile" : "/login"} aria-label={user ? "프로필" : "로그인"}>
            <svg aria-hidden="true" fill="currentColor" height="21" viewBox="0 0 24 24" width="21">
              <path d="M12 12.2a4.4 4.4 0 1 0 0-8.8 4.4 4.4 0 0 0 0 8.8Zm-7 8.3c.7-3.5 3.2-5.7 7-5.7s6.3 2.2 7 5.7H5Z" />
            </svg>
          </Link>
        </div>
      </div>
      <nav aria-label="주요 섹션" className="mz-primary-nav">
        <div className="mz-nav-links">
          <Link href="/">매거진</Link>
          <Link href="/issues">호별 보기</Link>
          <Link href="/hall-of-fame">명예의 전당</Link>
          <Link href="/board">게시판</Link>
          {canWrite ? <Link href="/studio">기사 제출</Link> : null}
          {user?.role === "admin" ? <Link href="/admin">어드민</Link> : null}
          {user?.role === "teacher" ? <Link href="/admin/editorial">편집 관리</Link> : null}
        </div>
      </nav>
      <div className="mz-account-strip">
        <span>{formatToday()}</span>
        <AccountMenu user={user} />
      </div>
    </header>
  );
}
