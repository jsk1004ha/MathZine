"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function HallSubmissionForm({ problem, canSubmit }) {
  const router = useRouter();
  const [file, setFile] = useState(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    if (!canSubmit) {
      setMessage("풀이 제출은 로그인 후 가능합니다.");
      return;
    }

    if (!file) {
      setMessage("PDF 파일을 선택해 주세요.");
      return;
    }

    setPending(true);
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("problemId", problem.id);
      formData.append("file", file);

      const response = await fetch("/api/hall-of-fame/submissions", {
        method: "POST",
        body: formData
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "PDF 제출에 실패했습니다.");
      }

      setFile(null);
      event.currentTarget.reset();
      router.refresh();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="problem-submit-form" onSubmit={handleSubmit}>
      <p className="panel-note">한 개의 PDF로 정리해서 제출하면 채점과 보관이 가장 깔끔합니다.</p>
      <label>
        <span>PDF 풀이 업로드</span>
        <input accept="application/pdf,.pdf" onChange={(event) => setFile(event.target.files?.[0] ?? null)} type="file" />
      </label>
      <div className="form-submit-row">
        <button className="primary-button" disabled={pending} type="submit">
          {pending ? "업로드 중..." : "PDF 제출"}
        </button>
        {message ? <p className="error-note">{message}</p> : null}
      </div>
    </form>
  );
}
