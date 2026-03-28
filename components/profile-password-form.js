"use client";

import { useState } from "react";
import { parseApiError } from "@/lib/api-client";

export function ProfilePasswordForm() {
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: ""
  });
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setPending(true);
    setMessage("");

    try {
      const response = await fetch("/api/profile/password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(form)
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(parseApiError(payload, "비밀번호 재설정에 실패했습니다."));
      }

      setForm({
        currentPassword: "",
        newPassword: ""
      });
      setMessage(payload.data?.message || "비밀번호를 재설정했습니다.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="section-panel" onSubmit={handleSubmit}>
      <div className="section-heading">
        <p className="eyebrow">비밀번호 변경</p>
        <span>local 계정 전용 재설정</span>
      </div>
      <label>
        <span>현재 비밀번호</span>
        <input
          onChange={(event) => setForm((prev) => ({ ...prev, currentPassword: event.target.value }))}
          type="password"
          value={form.currentPassword}
        />
      </label>
      <label>
        <span>새 비밀번호</span>
        <input
          onChange={(event) => setForm((prev) => ({ ...prev, newPassword: event.target.value }))}
          type="password"
          value={form.newPassword}
        />
      </label>
      <div className="form-submit-row">
        <button className="primary-button" disabled={pending} type="submit">
          {pending ? "재설정 중..." : "비밀번호 재설정"}
        </button>
        {message ? <p className={message.includes("재설정") ? "status-note" : "error-note"}>{message}</p> : null}
      </div>
    </form>
  );
}
