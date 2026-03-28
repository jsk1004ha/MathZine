"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { parseApiError } from "@/lib/api-client";

export function LikeButton({ slug, initialLikeCount, initialLiked, canInteract }) {
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function handleLike() {
    if (!canInteract) {
      setMessage("좋아요는 로그인 후 사용할 수 있습니다.");
      return;
    }

    setPending(true);
    setMessage("");

    try {
      const response = await fetch(`/api/articles/${slug}/like`, {
        method: "POST"
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(parseApiError(payload, "좋아요 처리에 실패했습니다."));
      }

      setLiked(payload.data.liked);
      setLikeCount(payload.data.likeCount);
      setMessage(payload.data.liked ? "좋아요를 남겼습니다." : "좋아요를 취소했습니다.");
      router.refresh();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="metric-block">
      <button className={`reaction-button ${liked ? "active" : ""}`} disabled={pending} onClick={handleLike} type="button">
        {liked ? "♥" : "♡"} {likeCount}
      </button>
      {message ? <p className={message.includes("좋아요") ? "status-note" : "error-note"}>{message}</p> : null}
    </div>
  );
}
