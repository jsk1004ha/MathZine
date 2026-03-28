"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { parseApiError } from "@/lib/api-client";
import { SolutionNote } from "@/components/solution-note";

export function HallSubmissionForm({ problem, canSubmit }) {
  const router = useRouter();
  const noteRef = useRef(null);
  const [file, setFile] = useState(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    const formElement = event.currentTarget;

    if (!canSubmit) {
      setMessage("풀이 제출은 로그인 후 가능합니다.");
      return;
    }

    let submissionFile = file;

    if (!submissionFile && noteRef.current?.hasInk()) {
      submissionFile = await noteRef.current.exportFile();
    }

    if (!submissionFile) {
      setMessage("PDF, 풀이 사진, 또는 온라인 노트 중 하나를 제출해 주세요.");
      return;
    }

    setPending(true);
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("problemId", problem.id);
      formData.append("file", submissionFile);

      const response = await fetch("/api/hall-of-fame/submissions", {
        method: "POST",
        body: formData
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(parseApiError(payload, "풀이 제출에 실패했습니다."));
      }

      setFile(null);
      formElement.reset();
      noteRef.current?.clear();
      setMessage("제출이 완료되었습니다.");
      router.refresh();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="problem-submit-form" onSubmit={handleSubmit}>
      <p className="panel-note">PDF, 풀이 사진, 또는 아래 온라인 노트 중 하나로 제출할 수 있습니다.</p>
      <label>
        <span>파일 업로드</span>
        <input accept="application/pdf,.pdf,image/*" onChange={(event) => setFile(event.target.files?.[0] ?? null)} type="file" />
      </label>
      <SolutionNote ref={noteRef} />
      <div className="form-submit-row">
        <button className="primary-button" disabled={pending} type="submit">
          {pending ? "제출 중..." : "풀이 제출"}
        </button>
        {message ? <p className={message.includes("완료") ? "status-note" : "error-note"}>{message}</p> : null}
      </div>
    </form>
  );
}
