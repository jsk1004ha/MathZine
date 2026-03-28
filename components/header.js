import Link from "next/link";
import { AccountMenu } from "@/components/account-menu";

function formatToday() {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long"
  }).format(new Date());
}

export function Header({ user }) {
  return (
    <header className="site-header">
      <div className="utility-bar">
        <span>{formatToday()}</span>
        <span className="utility-note">The math magazine of the genius math club.</span>
      </div>
      <div className="masthead-row">
        <div>
          <p className="masthead-kicker">Mathematics Journal</p>
          <Link className="masthead-logo" href="/">
            MathZine
          </Link>
        </div>
        <AccountMenu user={user} />
      </div>
      <nav aria-label="주요 섹션" className="section-nav">
        <div className="nav-links">
          <Link href="/">메인페이지</Link>
          <Link href="/issues">호별 보기</Link>
          <Link href="/hall-of-fame">명예의 전당</Link>
          <Link href="/board">게시판</Link>
          {user && (user.role === "admin" || user.role === "reporter") ? <Link href="/studio">기사 제출</Link> : null}
          {user?.role === "admin" ? <Link href="/admin">어드민</Link> : null}
          {!user ? <Link href="/login">로그인</Link> : null}
        </div>
        <form action="/" className="header-search">
          <input name="q" placeholder="기사 검색" type="search" />
          <button aria-label="검색" title="검색" type="submit">
            <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
              <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
              <path d="M16 16L21 21" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
            </svg>
          </button>
        </form>
      </nav>
    </header>
  );
}
