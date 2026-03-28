"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminNav() {
  return (
    <nav className="admin-nav">
      <Link href="/admin">대시보드</Link>
      <Link href="/admin/editorial">편집 관리</Link>
      <Link href="/admin/accounts">계정 관리</Link>
      <Link href="/admin/hall-of-fame">명예의 전당</Link>
    </nav>
  );
}

export function AdminDashboard({
  articleCount,
  pendingIssueCount,
  submissionCount,
  teacherCount,
  userCount,
  recentArticles,
  recentIssues
}) {
  const cards = [
    { label: "검토 대기 호수", value: pendingIssueCount, href: "/admin/editorial" },
    { label: "제출 기사", value: articleCount, href: "/admin/editorial" },
    { label: "teacher 계정", value: teacherCount, href: "/admin/accounts" },
    { label: "풀이 제출", value: submissionCount, href: "/admin/hall-of-fame" }
  ];

  return (
    <section className="section-panel">
      <div className="section-heading">
        <p className="eyebrow">Admin</p>
        <h1>MathZine 운영 대시보드</h1>
      </div>
      <p>권한 관리, 편집 검토, 명예의 전당 운영을 분리해 다루도록 화면을 정리했습니다.</p>
      <div className="archive-grid">
        {cards.map((card) => (
          <Link className="archive-card" href={card.href} key={card.label}>
            <p className="story-tag">{card.label}</p>
            <h3>{card.value}</h3>
            <p>{card.label} 화면으로 이동</p>
          </Link>
        ))}
      </div>
      <p className="status-note">전체 사용자 {userCount}명</p>

      <div className="admin-grid">
        <section className="section-panel">
          <div className="section-heading">
            <p className="eyebrow">최근 제출 기사</p>
            <Link href="/admin/editorial">편집 관리로 이동</Link>
          </div>
          <div className="story-list compact-story-list">
            {recentArticles.length ? (
              recentArticles.map((article) => (
                <Link className="story-row" href={`/articles/${article.slug}`} key={article.slug}>
                  <div>
                    <p className="story-tag">
                      {article.issue} · {article.status}
                    </p>
                    <h3>{article.title}</h3>
                  </div>
                  <span className="story-metric">{article.authorNickname}</span>
                </Link>
              ))
            ) : (
              <p className="status-note">아직 제출된 기사가 없습니다.</p>
            )}
          </div>
        </section>

        <section className="section-panel">
          <div className="section-heading">
            <p className="eyebrow">발행 대기 호수</p>
            <Link href="/admin/editorial">호수 검토</Link>
          </div>
          <div className="story-list compact-story-list">
            {recentIssues.length ? (
              recentIssues.map((issue) => (
                <div className="story-row" key={issue.issueSlug}>
                  <div>
                    <p className="story-tag">{issue.status}</p>
                    <h3>{issue.issue}</h3>
                    <p>
                      기사 {issue.articleCount}개 · 제출 {issue.submittedCount}개 · 공개 {issue.publishedCount}개
                    </p>
                  </div>
                  <span className="story-metric">{issue.leadTitle || "대표 기사 없음"}</span>
                </div>
              ))
            ) : (
              <p className="status-note">발행 대기 호수가 없습니다.</p>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}

export function AdminAccountsPanel({ users }) {
  const router = useRouter();
  const [accountForm, setAccountForm] = useState({
    loginId: "",
    password: "",
    name: "",
    nickname: "",
    role: "teacher",
    student: "교사",
    studentNumber: "",
    generation: ""
  });
  const [accountMessage, setAccountMessage] = useState("");
  const [pendingAccount, setPendingAccount] = useState(false);

  async function updateRole(userId, role) {
    const response = await fetch(`/api/admin/users/${userId}/role`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ role })
    });

    if (response.ok) {
      router.refresh();
    }
  }

  async function createManagedAccount(event) {
    event.preventDefault();
    setPendingAccount(true);
    setAccountMessage("");

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(accountForm)
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "계정 생성에 실패했습니다.");
      }

      setAccountForm({
        loginId: "",
        password: "",
        name: "",
        nickname: "",
        role: "teacher",
        student: "교사",
        studentNumber: "",
        generation: ""
      });
      setAccountMessage("직접 생성 계정을 만들었습니다.");
      router.refresh();
    } catch (error) {
      setAccountMessage(error.message);
    } finally {
      setPendingAccount(false);
    }
  }

  return (
    <div className="admin-grid">
      <section className="section-panel">
        <div className="section-heading">
          <p className="eyebrow">권한 관리</p>
          <span>teacher 역할과 기자 권한 관리</span>
        </div>
        <div className="admin-user-list">
          {users.map((user) => (
            <div className="admin-user-row" key={user.id}>
              <div>
                <strong>{user.nickname}</strong>
                <p>
                  {user.name} · {user.authProvider === "local" ? `local:${user.loginId}` : `riro:${user.riroId}`} · 현재 역할 {user.role}
                </p>
              </div>
              <select defaultValue={user.role} onChange={(event) => updateRole(user.id, event.target.value)}>
                <option value="member">member</option>
                <option value="reporter">reporter</option>
                <option value="teacher">teacher</option>
                <option value="admin">admin</option>
              </select>
            </div>
          ))}
        </div>
      </section>

      <section className="section-panel">
        <div className="section-heading">
          <p className="eyebrow">직접 계정 생성</p>
          <span>교사 계정은 여기서 생성합니다</span>
        </div>
        <p className="panel-note">관리용 계정은 필요한 정보만 간결하게 입력하고, 역할은 생성 후에도 다시 바꿀 수 있습니다.</p>
        <form className="admin-form" onSubmit={createManagedAccount}>
          <div className="block-grid">
            <label>
              <span>로그인 ID</span>
              <input onChange={(event) => setAccountForm((prev) => ({ ...prev, loginId: event.target.value }))} value={accountForm.loginId} />
            </label>
            <label>
              <span>비밀번호</span>
              <input onChange={(event) => setAccountForm((prev) => ({ ...prev, password: event.target.value }))} type="password" value={accountForm.password} />
            </label>
          </div>
          <div className="block-grid">
            <label>
              <span>이름</span>
              <input onChange={(event) => setAccountForm((prev) => ({ ...prev, name: event.target.value }))} value={accountForm.name} />
            </label>
            <label>
              <span>닉네임</span>
              <input onChange={(event) => setAccountForm((prev) => ({ ...prev, nickname: event.target.value }))} value={accountForm.nickname} />
            </label>
          </div>
          <div className="block-grid">
            <label>
              <span>역할</span>
              <select onChange={(event) => setAccountForm((prev) => ({ ...prev, role: event.target.value }))} value={accountForm.role}>
                <option value="teacher">teacher</option>
                <option value="member">member</option>
                <option value="reporter">reporter</option>
                <option value="admin">admin</option>
              </select>
            </label>
            <label>
              <span>소속/표시</span>
              <input onChange={(event) => setAccountForm((prev) => ({ ...prev, student: event.target.value }))} value={accountForm.student} />
            </label>
          </div>
          <div className="form-submit-row">
            <button className="primary-button" disabled={pendingAccount} type="submit">
              {pendingAccount ? "생성 중..." : "계정 생성"}
            </button>
            {accountMessage ? <p className="status-note">{accountMessage}</p> : null}
          </div>
        </form>
      </section>
    </div>
  );
}

export function AdminEditorialPanel({ issues, articles }) {
  const router = useRouter();

  async function publishIssue(issueSlug) {
    const response = await fetch(`/api/admin/issues/${issueSlug}/publish`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      }
    });

    if (response.ok) {
      router.refresh();
    }
  }

  return (
    <div className="admin-grid">
      <section className="section-panel admin-wide">
        <div className="section-heading">
          <p className="eyebrow">호수 공개 관리</p>
          <span>기사는 제출되고, 호수 단위로 공개됩니다</span>
        </div>
        <div className="admin-submission-list">
          {issues.map((issue) => (
            <div className="admin-submission-card" key={issue.issueSlug}>
              <div>
                <strong>{issue.issue}</strong>
                <p>
                  상태 {issue.status} · 기사 {issue.articleCount}개 · 대기 {issue.submittedCount}개 · 공개 {issue.publishedCount}개
                </p>
                <p>{issue.leadTitle || "대표 기사 없음"}</p>
              </div>
              <div className="admin-score-controls">
                <button className="primary-button" disabled={issue.status === "published" || issue.articleCount === 0} onClick={() => publishIssue(issue.issueSlug)} type="button">
                  {issue.status === "published" ? "공개 완료" : "호수 공개"}
                </button>
              </div>
            </div>
          ))}
          {issues.length === 0 ? <p className="status-note">아직 제출된 호수가 없습니다.</p> : null}
        </div>
      </section>

      <section className="section-panel admin-wide">
        <div className="section-heading">
          <p className="eyebrow">제출 기사 목록</p>
          <span>어드민 검토 대상</span>
        </div>
        <div className="story-list">
          {articles.map((article) => (
            <a className="story-row" href={`/articles/${article.slug}`} key={article.slug}>
              <div>
                <p className="story-tag">
                  {article.issue} · {article.status}
                </p>
                <h3>{article.title}</h3>
                <p>{article.deck}</p>
              </div>
              <span className="story-metric">
                {article.authorNickname}
                <br />
                {new Date(article.submittedAt ?? article.updatedAt).toLocaleDateString("ko-KR")}
              </span>
            </a>
          ))}
          {articles.length === 0 ? <p className="status-note">아직 제출된 기사가 없습니다.</p> : null}
        </div>
      </section>
    </div>
  );
}

export function AdminHallPanel({ articles, submissions }) {
  const router = useRouter();
  const [problemForm, setProblemForm] = useState({
    articleSlug: articles[0]?.slug ?? "",
    title: "",
    prompt: ""
  });
  const [problemMessage, setProblemMessage] = useState("");
  const [pendingProblem, setPendingProblem] = useState(false);

  async function awardSubmission(submissionId, formData) {
    const points = Number(formData.get(`points_${submissionId}`));
    const status = String(formData.get(`status_${submissionId}`));

    await fetch(`/api/admin/hall-submissions/${submissionId}/score`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ points, status })
    });

    router.refresh();
  }

  async function createProblem(event) {
    event.preventDefault();
    setPendingProblem(true);
    setProblemMessage("");

    try {
      const response = await fetch("/api/admin/hall-problems", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(problemForm)
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "문제 생성에 실패했습니다.");
      }

      setProblemForm({
        articleSlug: articles[0]?.slug ?? "",
        title: "",
        prompt: ""
      });
      router.refresh();
    } catch (error) {
      setProblemMessage(error.message);
    } finally {
      setPendingProblem(false);
    }
  }

  return (
    <div className="admin-grid">
      <section className="section-panel">
        <div className="section-heading">
          <p className="eyebrow">문제 등록</p>
          <span>기사와 연결된 PDF 풀이 문제</span>
        </div>
        <p className="panel-note">문제는 기사와 직접 연결됩니다. 제목은 짧게, 설명은 제출 기준이 드러나게 적는 편이 좋습니다.</p>
        <form className="admin-form" onSubmit={createProblem}>
          <label>
            <span>연결 기사</span>
            <select onChange={(event) => setProblemForm((prev) => ({ ...prev, articleSlug: event.target.value }))} value={problemForm.articleSlug}>
              {articles.map((article) => (
                <option key={article.slug} value={article.slug}>
                  {article.issue} · {article.title} ({article.status})
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>문제 제목</span>
            <input onChange={(event) => setProblemForm((prev) => ({ ...prev, title: event.target.value }))} value={problemForm.title} />
          </label>
          <label>
            <span>문제 설명</span>
            <textarea onChange={(event) => setProblemForm((prev) => ({ ...prev, prompt: event.target.value }))} rows={6} value={problemForm.prompt} />
          </label>
          <div className="form-submit-row">
            <button className="primary-button" disabled={pendingProblem} type="submit">
              {pendingProblem ? "등록 중..." : "문제 등록"}
            </button>
            {problemMessage ? <p className="error-note">{problemMessage}</p> : null}
          </div>
        </form>
      </section>

      <section className="section-panel admin-wide">
        <div className="section-heading">
          <p className="eyebrow">풀이 채점</p>
          <span>점수 랭킹 반영</span>
        </div>
        <div className="admin-submission-list">
          {submissions.map((submission) => (
            <form
              className="admin-submission-card"
              key={submission.id}
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                awardSubmission(submission.id, formData);
              }}
            >
              <div>
                <strong>{submission.nickname}</strong>
                <p>
                  {submission.problem?.title ?? "문제 없음"} · {new Date(submission.submittedAt).toLocaleString("ko-KR")}
                </p>
                <p>{submission.originalFileName}</p>
                {submission.storedFileName ? (
                  <a href={`/api/admin/hall-submissions/${submission.id}/file`} rel="noreferrer" target="_blank">
                    PDF 열기
                  </a>
                ) : null}
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
          {submissions.length === 0 ? <p className="status-note">제출된 풀이가 없습니다.</p> : null}
        </div>
      </section>
    </div>
  );
}
