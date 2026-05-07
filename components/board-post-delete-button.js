"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { parseApiError } from "@/lib/api-client";

export function BoardPostDeleteButton({ postId, title }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function deletePost() {
    if (!window.confirm(`게시글 "${title}"을 삭제할까요?`)) {
      return;
    }

    setPending(true);
    setMessage("");

    try {
      const response = await fetch(`/api/admin/board-posts/${encodeURIComponent(postId)}`, {
        method: "DELETE"
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(parseApiError(payload, "게시글 삭제에 실패했습니다."));
      }

      setMessage("삭제했습니다.");
      router.refresh();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="inline-action-stack">
      <button className="ghost-button danger-button" disabled={pending} onClick={deletePost} type="button">
        {pending ? "삭제 중..." : "글 삭제"}
      </button>
      {message ? <p className={message.includes("삭제") ? "status-note" : "error-note"}>{message}</p> : null}
    </div>
  );
}
