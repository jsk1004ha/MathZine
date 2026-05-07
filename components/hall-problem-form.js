"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { parseApiError } from "@/lib/api-client";

const TYPE_LABELS = {
  multiple_choice: "객관식",
  short_answer: "주관식",
  essay: "서술형"
};

export function HallProblemForm({ articleSlug }) {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "",
    prompt: "",
    type: "essay",
    choices: "",
    correctAnswer: "",
    scoringGuide: "",
    points: 10
  });
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function createProblem(event) {
    event.preventDefault();
    setPending(true);
    setMessage("");

    try {
      const response = await fetch("/api/hall-of-fame/problems", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...form,
          articleSlug,
          choices: form.choices.split(/\r?\n/).map((choice) => choice.trim()).filter(Boolean)
        })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(parseApiError(payload, "문제 생성에 실패했습니다."));
      }

      setForm({
        title: "",
        prompt: "",
        type: "essay",
        choices: "",
        correctAnswer: "",
        scoringGuide: "",
        points: 10
      });
      setMessage("문제를 만들었습니다.");
      router.refresh();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="problem-create-form" onSubmit={createProblem}>
      <div className="section-heading">
        <p className="eyebrow">기사 문제 만들기</p>
        <span>객관식·주관식·서술형 지원</span>
      </div>
      <p className="panel-note">
        기자는 본인이 쓴 기사 아래에 문제를 붙일 수 있습니다. 객관식/주관식은 정답을 넣으면 자동 채점되고, 서술형은 기자가 제출물을 열어 직접 채점합니다.
      </p>
      <div className="block-grid">
        <label>
          <span>문제 제목</span>
          <input onChange={(event) => updateField("title", event.target.value)} placeholder="예: 기사 속 정리 적용하기" value={form.title} />
        </label>
        <label>
          <span>배점</span>
          <input max="100" min="1" onChange={(event) => updateField("points", event.target.value)} type="number" value={form.points} />
        </label>
      </div>
      <label>
        <span>문제 종류</span>
        <select onChange={(event) => updateField("type", event.target.value)} value={form.type}>
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>문제 내용</span>
        <textarea onChange={(event) => updateField("prompt", event.target.value)} placeholder="학생이 무엇을 제출해야 하는지 한 문단으로 적어 주세요." rows={5} value={form.prompt} />
      </label>
      {form.type === "multiple_choice" ? (
        <label>
          <span>선택지</span>
          <textarea onChange={(event) => updateField("choices", event.target.value)} placeholder={"한 줄에 하나씩 입력\n예: 12\n예: 24"} rows={5} value={form.choices} />
        </label>
      ) : null}
      {form.type !== "essay" ? (
        <label>
          <span>정답</span>
          <input onChange={(event) => updateField("correctAnswer", event.target.value)} placeholder={form.type === "multiple_choice" ? "선택지 중 하나와 정확히 같게 입력" : "띄어쓰기 차이는 어느 정도 정규화됩니다"} value={form.correctAnswer} />
        </label>
      ) : null}
      <label>
        <span>채점 메모/힌트</span>
        <textarea onChange={(event) => updateField("scoringGuide", event.target.value)} placeholder="서술형 채점 기준, 풀이 힌트, 주의할 오답 등을 적어 두세요." rows={3} value={form.scoringGuide} />
      </label>
      <div className="form-submit-row">
        <button className="primary-button" disabled={pending} type="submit">
          {pending ? "생성 중..." : "문제 만들기"}
        </button>
        {message ? <p className={message.includes("만들") ? "status-note" : "error-note"}>{message}</p> : null}
      </div>
    </form>
  );
}
