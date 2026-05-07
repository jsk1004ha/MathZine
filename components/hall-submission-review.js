"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { parseApiError } from "@/lib/api-client";

export function HallSubmissionReview({ problem }) {
  const router = useRouter();
  const [message, setMessage] = useState("");

  async function scoreSubmission(submissionId, formData) {
    setMessage("");

    const response = await fetch(`/api/admin/hall-submissions/${submissionId}/score`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        status: String(formData.get(`status_${submissionId}`)),
        points: Number(formData.get(`points_${submissionId}`))
      })
    });
    const payload = await response.json();

    if (!response.ok) {
      setMessage(parseApiError(payload, "채점 저장에 실패했습니다."));
      return;
    }

    setMessage("채점을 저장했습니다.");
    router.refresh();
  }

  return (
    <div className="submission-review-panel">
      <div className="section-heading">
        <p className="eyebrow">제출물 채점</p>
        <span>{problem.submissions?.length ?? 0} submissions</span>
      </div>
      {problem.scoringGuide ? <p className="panel-note">채점 기준: {problem.scoringGuide}</p> : null}
      <div className="admin-submission-list">
        {(problem.submissions ?? []).map((submission) => (
          <form
            className="admin-submission-card"
            key={submission.id}
            onSubmit={(event) => {
              event.preventDefault();
              scoreSubmission(submission.id, new FormData(event.currentTarget));
            }}
          >
            <div>
              <strong>{submission.nickname}</strong>
              <p>
                {new Date(submission.submittedAt).toLocaleString("ko-KR")} · {submission.status} · {submission.awardedPoints} pts
              </p>
              {submission.answerText ? <p className="submission-answer">답안: {submission.answerText}</p> : null}
              {submission.storedFileName ? (
                <a href={`/api/admin/hall-submissions/${submission.id}/file`} rel="noreferrer" target="_blank">
                  첨부 열기 ({submission.originalFileName})
                </a>
              ) : null}
              {submission.autoGraded ? <p className="inline-note">자동 채점: {submission.isCorrect ? "정답" : "오답"}</p> : null}
            </div>
            <div className="admin-score-controls">
              <select defaultValue={submission.status} name={`status_${submission.id}`}>
                <option value="submitted">submitted</option>
                <option value="awarded">awarded</option>
                <option value="rejected">rejected</option>
              </select>
              <input defaultValue={submission.awardedPoints ?? 0} min="0" name={`points_${submission.id}`} type="number" />
              <button className="ghost-button" type="submit">
                저장
              </button>
            </div>
          </form>
        ))}
        {!(problem.submissions ?? []).length ? <p className="status-note">아직 제출된 풀이가 없습니다.</p> : null}
      </div>
      {message ? <p className={message.includes("저장") ? "status-note" : "error-note"}>{message}</p> : null}
    </div>
  );
}
