"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CommentForm({ slug, canComment }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    if (!canComment) {
      setMessage("댓글은 로그인 후 작성할 수 있습니다.");
      return;
    }

    setPending(true);
    setMessage("");

    try {
      const response = await fetch(`/api/articles/${slug}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ body })
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "댓글 등록에 실패했습니다.");
      }

      setBody("");
      router.refresh();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="comment-form" onSubmit={handleSubmit}>
      <p className="panel-note">짧은 한두 문장보다, 기사와 연결되는 생각을 또렷하게 남기면 읽기 좋습니다.</p>
      <textarea
        onChange={(event) => setBody(event.target.value)}
        placeholder={canComment ? "기사를 읽고 떠오른 생각을 남겨 보세요." : "댓글은 로그인 후 작성할 수 있습니다."}
        rows={4}
        value={body}
      />
      <div className="comment-form-footer form-submit-row">
        <button className="primary-button" disabled={pending} type="submit">
          {pending ? "등록 중..." : "댓글 남기기"}
        </button>
        {message ? <p className="inline-note">{message}</p> : null}
      </div>
    </form>
  );
}
