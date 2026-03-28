"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { parseApiError } from "@/lib/api-client";

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
  const validation = {
    riroId: form.riroId.trim().length >= 4,
    password: form.password.length >= 8,
    nickname: !isSignup || form.nickname.trim().length >= 2,
    terms: !isSignup || form.acceptedTerms
  };
  const canSubmit = Object.values(validation).every(Boolean);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!canSubmit) {
      setMessage("입력 항목을 다시 확인해 주세요.");
      return;
    }

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
        throw new Error(parseApiError(payload, "인증에 실패했습니다."));
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
        <small className="inline-note">학번 또는 리로스쿨 로그인 ID를 입력합니다.</small>
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
        <small className="inline-note">8자 이상 입력해 주세요.</small>
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
          <small className="inline-note">2자 이상 24자 이하. 댓글과 랭킹에 표시됩니다.</small>
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
      {isSignup ? <p className="status-note">가입 후 바로 로그인되며, 기사 읽기는 로그인 없이도 가능합니다.</p> : null}
      {!validation.riroId ? <p className="inline-note">로그인 ID를 조금 더 정확히 입력해 주세요.</p> : null}
      {!validation.password ? <p className="inline-note">비밀번호는 8자 이상이어야 합니다.</p> : null}
      {isSignup && !validation.nickname ? <p className="inline-note">닉네임은 2자 이상이어야 합니다.</p> : null}
      {message ? <p className={message.includes("완료") ? "status-note" : "error-note"}>{message}</p> : null}
    </form>
  );
}
