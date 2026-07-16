"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { parseApiError } from "@/lib/api-client";

export function LogoutButton() {
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

  return (
    <div className="profile-account-actions">
      <button className="ghost-button" disabled={pending} onClick={handleLogout} type="button">
        {pending ? "로그아웃 중..." : "로그아웃"}
      </button>
      {message ? <span className="error-note">{message}</span> : null}
    </div>
  );
}
