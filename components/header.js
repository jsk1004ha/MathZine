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
      <div className="utility-bar topline">
        <span>{formatToday()}</span>
        <span className="utility-note">Seoul Mathematical Review · Beta edition</span>
      </div>
      <div className="masthead-row masthead">
        <p className="masthead__aside masthead-kicker">
          Mathematics Journal
          <span>For readers who prove things</span>
        </p>
        <Link className="masthead-logo masthead__mark" href="/">
          MathZine
        </Link>
        <div className="masthead__aside masthead-account">
          <span>The math magazine of the genius math club.</span>
          <AccountMenu user={user} />
        </div>
      </div>
      <nav aria-label="주요 섹션" className="section-nav nav">
        <div className="nav-links nav__links">
          <Link href="/">소개</Link>
          <Link href="/issues">호별 보기</Link>
          <Link href="/hall-of-fame">명예의 전당</Link>
          <Link href="/board">게시판</Link>
          {user && (user.role === "admin" || user.role === "reporter") ? <Link href="/studio">기사 제출</Link> : null}
          {user?.role === "admin" ? <Link href="/admin">어드민</Link> : null}
          {user?.role === "teacher" ? <Link href="/admin/editorial">편집 관리</Link> : null}
          {!user ? <Link href="/login">로그인</Link> : null}
        </div>
        <form action="/search" className="header-search search-box nav__actions">
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
