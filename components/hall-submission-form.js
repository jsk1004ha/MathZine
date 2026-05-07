"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { parseApiError } from "@/lib/api-client";
import { SolutionNote } from "@/components/solution-note";

export function HallSubmissionForm({ problem, canSubmit }) {
  const router = useRouter();
  const noteRef = useRef(null);
  const [file, setFile] = useState(null);
  const [answerText, setAnswerText] = useState("");
  const [selectedChoice, setSelectedChoice] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const problemType = problem.type ?? "essay";

  async function handleSubmit(event) {
    event.preventDefault();
    const formElement = event.currentTarget;

    if (!canSubmit) {
      setMessage("풀이 제출은 로그인 후 가능합니다.");
      return;
    }

    let submissionFile = file;
    const trimmedAnswer = answerText.trim();
    const trimmedChoice = selectedChoice.trim();

    if (!submissionFile && noteRef.current?.hasInk()) {
      submissionFile = await noteRef.current.exportFile();
    }

    if (problemType === "multiple_choice" && !trimmedChoice) {
      setMessage("객관식 답을 선택해 주세요.");
      return;
    }

    if (problemType === "short_answer" && !trimmedAnswer) {
      setMessage("주관식 답을 입력해 주세요.");
      return;
    }

    if (problemType === "essay" && !trimmedAnswer && !submissionFile) {
      setMessage("서술형 풀이는 글, 파일, 온라인 노트 중 하나로 제출해 주세요.");
      return;
    }

    setPending(true);
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("problemId", problem.id);
      formData.append("answerText", trimmedAnswer);
      formData.append("selectedChoice", trimmedChoice);

      if (submissionFile) {
        formData.append("file", submissionFile);
      }

      const response = await fetch("/api/hall-of-fame/submissions", {
        method: "POST",
        body: formData
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(parseApiError(payload, "풀이 제출에 실패했습니다."));
      }

      setFile(null);
      setAnswerText("");
      setSelectedChoice("");
      formElement.reset();
      noteRef.current?.clear();
      setMessage(payload.submission?.autoGraded ? `제출이 완료되었습니다. 자동 채점 결과: ${payload.submission.isCorrect ? "정답" : "오답"}` : "제출이 완료되었습니다.");
      router.refresh();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="problem-submit-form" onSubmit={handleSubmit}>
      <p className="panel-note">
        {problemType === "multiple_choice"
          ? "선택지만 고르면 바로 자동 채점됩니다."
          : problemType === "short_answer"
            ? "짧은 답을 입력하면 자동 채점됩니다. 필요한 경우 풀이 파일도 함께 올릴 수 있습니다."
            : "서술형은 글로 바로 쓰거나, PDF/사진/온라인 노트로 제출할 수 있습니다. 기자가 직접 채점합니다."}
      </p>
      {problemType === "multiple_choice" ? (
        <fieldset className="choice-list">
          <legend>답 선택</legend>
          {(problem.choices ?? []).map((choice) => (
            <label className="choice-option" key={choice}>
              <input checked={selectedChoice === choice} name={`choice_${problem.id}`} onChange={() => setSelectedChoice(choice)} type="radio" value={choice} />
              <span>{choice}</span>
            </label>
          ))}
        </fieldset>
      ) : (
        <label>
          <span>{problemType === "short_answer" ? "답" : "풀이 글"}</span>
          <textarea
            onChange={(event) => setAnswerText(event.target.value)}
            placeholder={problemType === "short_answer" ? "답만 간단히 입력해 주세요." : "여기에 바로 풀이를 적어도 됩니다."}
            rows={problemType === "short_answer" ? 2 : 5}
            value={answerText}
          />
        </label>
      )}
      {problemType !== "multiple_choice" ? (
        <>
          <label>
            <span>파일 업로드</span>
            <input accept="application/pdf,.pdf,image/*" onChange={(event) => setFile(event.target.files?.[0] ?? null)} type="file" />
          </label>
          <SolutionNote ref={noteRef} />
        </>
      ) : null}
      <div className="form-submit-row">
        <button className="primary-button" disabled={pending} type="submit">
          {pending ? "제출 중..." : "풀이 제출"}
        </button>
        {message ? <p className={message.includes("완료") ? "status-note" : "error-note"}>{message}</p> : null}
      </div>
    </form>
  );
}
