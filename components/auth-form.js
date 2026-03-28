"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AuthForm({ mode }) {
  const router = useRouter();
  const [form, setForm] = useState({
    riroId: "",
    password: "",
    nickname: "",
    rememberMe: true,
    acceptedTerms: false
  });
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const isSignup = mode === "signup";

  async function handleSubmit(event) {
    event.preventDefault();
    setPending(true);
    setMessage("");

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(form)
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "인증에 실패했습니다.");
      }

      router.push(isSignup ? "/studio" : "/");
      router.refresh();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <label>
        <span>{isSignup ? "리로스쿨 ID" : "로그인 ID"}</span>
        <input
          autoComplete="username"
          name="riroId"
          onChange={(event) => setForm((prev) => ({ ...prev, riroId: event.target.value }))}
          placeholder="예: 260101"
          required
          type="text"
          value={form.riroId}
        />
      </label>
      <label>
        <span>비밀번호</span>
        <input
          autoComplete={isSignup ? "new-password" : "current-password"}
          name="password"
          onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
          placeholder="비밀번호"
          required
          type="password"
          value={form.password}
        />
      </label>
      {isSignup ? (
        <label>
          <span>닉네임</span>
          <input
            maxLength={24}
            name="nickname"
            onChange={(event) => setForm((prev) => ({ ...prev, nickname: event.target.value }))}
            placeholder="댓글과 랭킹에 표시될 닉네임"
            required
            type="text"
            value={form.nickname}
          />
        </label>
      ) : null}
      <label className="check-row">
        <input
          checked={form.rememberMe}
          name="rememberMe"
          onChange={(event) => setForm((prev) => ({ ...prev, rememberMe: event.target.checked }))}
          type="checkbox"
        />
        <span>자동 로그인 유지</span>
      </label>
      {isSignup ? (
        <label className="check-row">
          <input
            checked={form.acceptedTerms}
            name="acceptedTerms"
            onChange={(event) => setForm((prev) => ({ ...prev, acceptedTerms: event.target.checked }))}
            required
            type="checkbox"
          />
          <span>리로스쿨 정보 확인, 닉네임 표시, 댓글·게시판 기록 저장 약관에 동의합니다.</span>
        </label>
      ) : null}
      <button className="primary-button wide-button" disabled={pending} type="submit">
        {pending ? "인증 중..." : isSignup ? "리로스쿨 인증 후 가입" : "로그인"}
      </button>
      {isSignup ? <p className="status-note">가입 후 바로 로그인할 수 있습니다.</p> : null}
      {message ? <p className="error-note">{message}</p> : null}
    </form>
  );
}
