"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

export function SiteSidebar({ canWrite = false, isAdmin = false, isTeacher = false, user = null }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const closeButtonRef = useRef(null);

  const closeSidebar = useCallback(() => {
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => closeButtonRef.current?.focus());

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeSidebar();
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = panelRef.current?.querySelectorAll('a[href], button:not([disabled])');
      if (!focusable?.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeSidebar, open]);

  return (
    <>
      <button
        aria-controls="site-sidebar"
        aria-expanded={open}
        aria-label="사이드바 열기"
        className="mz-icon-button mz-menu-link"
        onClick={() => setOpen(true)}
        ref={triggerRef}
        type="button"
      >
        <svg aria-hidden="true" fill="none" height="24" viewBox="0 0 24 24" width="24">
          <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeLinecap="square" strokeWidth="1.7" />
        </svg>
      </button>

      {open ? (
        <>
          <button aria-label="사이드바 닫기" className="mz-sidebar-backdrop" onClick={closeSidebar} type="button" />
          <aside aria-label="사이트 메뉴" aria-modal="true" className="mz-sidebar" id="site-sidebar" ref={panelRef} role="dialog">
            <div className="mz-sidebar-header">
              <Link className="mz-sidebar-wordmark" href="/" onClick={closeSidebar}>
                MathZine
              </Link>
              <button aria-label="사이드바 닫기" className="mz-sidebar-close" onClick={closeSidebar} ref={closeButtonRef} type="button">
                <svg aria-hidden="true" fill="none" height="24" viewBox="0 0 24 24" width="24">
                  <path d="m5 5 14 14M19 5 5 19" stroke="currentColor" strokeLinecap="square" strokeWidth="1.6" />
                </svg>
              </button>
            </div>

            <nav aria-label="사이드바 주요 섹션" className="mz-sidebar-nav">
              <Link href="/" onClick={closeSidebar}>
                <span>01</span>매거진
              </Link>
              <Link href="/issues" onClick={closeSidebar}>
                <span>02</span>호별 보기
              </Link>
              <Link href="/hall-of-fame" onClick={closeSidebar}>
                <span>03</span>명예의 전당
              </Link>
              <Link href="/board" onClick={closeSidebar}>
                <span>04</span>게시판
              </Link>
              <Link href="/search" onClick={closeSidebar}>
                <span>05</span>검색
              </Link>
              {canWrite ? (
                <Link href="/studio" onClick={closeSidebar}>
                  <span>06</span>기사 제출
                </Link>
              ) : null}
              {isAdmin ? (
                <Link href="/admin" onClick={closeSidebar}>
                  <span>07</span>어드민
                </Link>
              ) : null}
              {isTeacher ? (
                <Link href="/admin/editorial" onClick={closeSidebar}>
                  <span>07</span>편집 관리
                </Link>
              ) : null}
            </nav>

            <div className="mz-sidebar-account">
              <p>ACCOUNT</p>
              {user ? (
                <Link href="/profile" onClick={closeSidebar}>
                  {user.nickname} 프로필
                </Link>
              ) : (
                <div>
                  <Link href="/login" onClick={closeSidebar}>
                    로그인
                  </Link>
                  <Link href="/signup" onClick={closeSidebar}>
                    회원가입
                  </Link>
                </div>
              )}
            </div>
          </aside>
        </>
      ) : null}
    </>
  );
}
