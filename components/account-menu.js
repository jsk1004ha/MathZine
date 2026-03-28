"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { parseApiError } from "@/lib/api-client";

export function AccountMenu({ user }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function handleLogout() {
    setPending(true);
    setMessage("");

    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(parseApiError(payload, "로그아웃에 실패했습니다."));
      }

      router.push("/");
      router.refresh();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setPending(false);
    }
  }

  if (!user) {
    return (
      <div className="account-actions">
        <a className="utility-link" href="/login">
          로그인
        </a>
        <a className="primary-button" href="/signup">
          회원가입
        </a>
      </div>
    );
  }

  return (
    <div className="account-actions">
      <a className="utility-link" href="/profile">
        {user.nickname}
      </a>
      {user.role === "admin" || user.role === "reporter" ? (
        <a className="utility-link" href="/studio">
          스튜디오
        </a>
      ) : null}
      {user.role === "admin" ? (
        <a className="utility-link" href="/admin">
          어드민
        </a>
      ) : null}
      <button className="ghost-button" disabled={pending} onClick={handleLogout} type="button">
        {pending ? "로그아웃 중..." : "로그아웃"}
      </button>
      {message ? <span className="error-note">{message}</span> : null}
    </div>
  );
}
