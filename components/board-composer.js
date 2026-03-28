"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function BoardComposer({ canPost, canCreateNotice }) {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "",
    excerpt: "",
    body: "",
    kind: "discussion"
  });
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    if (!canPost) {
      setMessage("게시판 글 작성은 로그인 후 가능합니다.");
      return;
    }

    setPending(true);
    setMessage("");

    try {
      const response = await fetch("/api/board-posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(form)
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "게시글 등록에 실패했습니다.");
      }

      setForm({
        title: "",
        excerpt: "",
        body: "",
        kind: "discussion"
      });
      router.refresh();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="section-panel board-composer" onSubmit={handleSubmit}>
      <div className="section-heading">
        <p className="eyebrow">의견 남기기</p>
        <span>로그인 사용자 게시판</span>
      </div>
      <p className="panel-note">짧은 제목과 요약을 먼저 적고, 본문에는 의견을 또렷하게 남겨 주세요.</p>
      {canCreateNotice ? (
        <label>
          <span>글 종류</span>
          <select onChange={(event) => setForm((prev) => ({ ...prev, kind: event.target.value }))} value={form.kind}>
            <option value="discussion">일반 의견</option>
            <option value="notice">어드민 공지</option>
          </select>
        </label>
      ) : null}
      <label>
        <span>제목</span>
        <input onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} placeholder="예: 이번 호 문제 풀이 난이도에 대한 의견" value={form.title} />
      </label>
      <label>
        <span>요약</span>
        <textarea onChange={(event) => setForm((prev) => ({ ...prev, excerpt: event.target.value }))} placeholder="한두 문장으로 핵심을 적어 주세요." rows={2} value={form.excerpt} />
      </label>
      <label>
        <span>본문</span>
        <textarea onChange={(event) => setForm((prev) => ({ ...prev, body: event.target.value }))} placeholder="읽는 사람이 바로 이해할 수 있게 문단을 나눠 작성해 보세요." rows={6} value={form.body} />
      </label>
      <div className="form-submit-row">
        <button className="primary-button" disabled={pending} type="submit">
          {pending ? "등록 중..." : "게시판에 올리기"}
        </button>
        {message ? <p className="error-note">{message}</p> : null}
      </div>
    </form>
  );
}
