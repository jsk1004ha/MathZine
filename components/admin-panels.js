"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { parseApiError } from "@/lib/api-client";

export function AdminNav({ user }) {
  const isAdmin = user?.role === "admin";

  return (
    <nav className="admin-nav">
      {isAdmin ? <Link href="/admin">대시보드</Link> : null}
      <Link href="/admin/editorial">편집 관리</Link>
      {isAdmin ? <Link href="/admin/accounts">계정 관리</Link> : null}
      {isAdmin ? <Link href="/admin/hall-of-fame">명예의 전당</Link> : null}
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

export function AdminAccountsPanel({ currentUserId, users }) {
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

    const payload = await response.json();

    if (!response.ok) {
      setAccountMessage(parseApiError(payload, "권한 변경에 실패했습니다."));
      return;
    }

    setAccountMessage("권한을 변경했습니다.");
    router.refresh();
  }

  async function updateBanStatus(userId, status) {
    const reason = status === "banned" ? window.prompt("차단 사유를 입력해 주세요.", "운영 정책 위반") || "" : "";
    const response = await fetch(`/api/admin/users/${userId}/ban`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ status, reason })
    });
    const payload = await response.json();

    if (!response.ok) {
      setAccountMessage(parseApiError(payload, "상태 변경에 실패했습니다."));
      return;
    }

    setAccountMessage(status === "banned" ? "계정을 차단했습니다." : "계정 차단을 해제했습니다.");
    router.refresh();
  }

  async function resetLocalPassword(userId) {
    const password = window.prompt("새 비밀번호를 입력해 주세요. 8자 이상이어야 합니다.", "");

    if (!password) {
      return;
    }

    const response = await fetch(`/api/admin/users/${userId}/password`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ password })
    });
    const payload = await response.json();

    if (!response.ok) {
      setAccountMessage(parseApiError(payload, "비밀번호 재설정에 실패했습니다."));
      return;
    }

    setAccountMessage("비밀번호를 재설정했습니다.");
  }

  async function deleteAccount(userId, nickname) {
    if (!window.confirm(`${nickname} 계정을 삭제할까요? 작성 콘텐츠는 탈퇴한 사용자로 표시됩니다.`)) {
      return;
    }

    const response = await fetch(`/api/admin/users/${userId}`, {
      method: "DELETE"
    });
    const payload = await response.json();

    if (!response.ok) {
      setAccountMessage(parseApiError(payload, "계정 삭제에 실패했습니다."));
      return;
    }

    setAccountMessage("계정을 삭제하고 작성 기록을 익명화했습니다.");
    router.refresh();
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
        throw new Error(parseApiError(payload, "계정 생성에 실패했습니다."));
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
                  {user.name} · {user.authProvider === "local" ? `local:${user.loginId}` : `riro:${user.riroId}`} · 현재 역할 {user.role} · 상태 {user.status}
                </p>
                {user.status === "banned" ? <p className="error-note">차단 사유: {user.banReason || "운영 정책 위반"}</p> : null}
              </div>
              <div className="admin-score-controls">
                <select defaultValue={user.role} onChange={(event) => updateRole(user.id, event.target.value)}>
                  <option value="member">member</option>
                  <option value="reporter">reporter</option>
                  <option value="teacher">teacher</option>
                  <option value="admin">admin</option>
                </select>
                {user.role !== "admin" ? (
                  <button className="ghost-button" onClick={() => updateBanStatus(user.id, user.status === "banned" ? "active" : "banned")} type="button">
                    {user.status === "banned" ? "차단 해제" : "차단"}
                  </button>
                ) : null}
                {user.authProvider === "local" ? (
                  <button className="ghost-button" onClick={() => resetLocalPassword(user.id)} type="button">
                    비밀번호 재설정
                  </button>
                ) : null}
                {user.id !== currentUserId ? (
                  <button className="ghost-button danger-button" onClick={() => deleteAccount(user.id, user.nickname)} type="button">
                    계정 삭제
                  </button>
                ) : null}
              </div>
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
            {accountMessage ? <p className={accountMessage.includes("실패") ? "error-note" : "status-note"}>{accountMessage}</p> : null}
          </div>
        </form>
      </section>
    </div>
  );
}

export function AdminEditorialPanel({ issues, articles }) {
  const router = useRouter();
  const [issueForm, setIssueForm] = useState({ issue: "" });
  const [editorialMessage, setEditorialMessage] = useState("");
  const [pendingCoverIssueSlug, setPendingCoverIssueSlug] = useState("");
  const [pendingDeleteIssueSlug, setPendingDeleteIssueSlug] = useState("");
  const [pendingIssueCreate, setPendingIssueCreate] = useState(false);

  async function createIssue(event) {
    event.preventDefault();
    setPendingIssueCreate(true);
    setEditorialMessage("");

    try {
      const response = await fetch("/api/admin/issues", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(issueForm)
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(parseApiError(payload, "호수 생성에 실패했습니다."));
      }

      setIssueForm({ issue: "" });
      setEditorialMessage("새 호수를 만들었습니다. 기자는 이 호수를 선택해 기사를 제출할 수 있습니다.");
      router.refresh();
    } catch (error) {
      setEditorialMessage(error.message);
    } finally {
      setPendingIssueCreate(false);
    }
  }

  async function publishIssue(issueSlug) {
    const response = await fetch(`/api/admin/issues/${issueSlug}/publish`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      }
    });
    const payload = await response.json();

    if (!response.ok) {
      setEditorialMessage(parseApiError(payload, "호수 공개에 실패했습니다."));
      return;
    }

    setEditorialMessage("호수를 공개했습니다.");
    router.refresh();
  }

  async function unpublishIssue(issueSlug) {
    if (!window.confirm("이 호수를 내릴까요? 연결된 기사는 다시 검토 대기 상태가 됩니다.")) {
      return;
    }

    const response = await fetch(`/api/admin/issues/${issueSlug}/unpublish`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      }
    });
    const payload = await response.json();

    if (!response.ok) {
      setEditorialMessage(parseApiError(payload, "호수 내리기에 실패했습니다."));
      return;
    }

    setEditorialMessage("호수를 내리고 연결 기사를 검토 대기로 전환했습니다.");
    router.refresh();
  }

  async function uploadCover(issueSlug, event) {
    event.preventDefault();
    setPendingCoverIssueSlug(issueSlug);
    setEditorialMessage("");

    try {
      const formData = new FormData(event.currentTarget);
      const response = await fetch(`/api/admin/issues/${issueSlug}/cover`, {
        method: "POST",
        body: formData
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(parseApiError(payload, "표지 업로드에 실패했습니다."));
      }

      setEditorialMessage("표지를 저장했습니다.");
      event.currentTarget.reset();
      router.refresh();
    } catch (error) {
      setEditorialMessage(error.message);
    } finally {
      setPendingCoverIssueSlug("");
    }
  }

  async function clearCover(issueSlug) {
    setPendingCoverIssueSlug(issueSlug);
    setEditorialMessage("");

    try {
      const response = await fetch(`/api/admin/issues/${issueSlug}/cover`, {
        method: "DELETE"
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(parseApiError(payload, "표지 제거에 실패했습니다."));
      }

      setEditorialMessage("표지를 제거했습니다. PDF는 기본 표지를 사용합니다.");
      router.refresh();
    } catch (error) {
      setEditorialMessage(error.message);
    } finally {
      setPendingCoverIssueSlug("");
    }
  }

  async function deleteIssue(issueSlug, issueName) {
    if (!window.confirm(`호수 "${issueName}"를 영구 삭제할까요?\n\n연결된 기사가 있으면 삭제되지 않습니다. 빈 호수의 표지 설정을 포함한 호수 기록만 삭제됩니다.`)) {
      return;
    }

    setPendingDeleteIssueSlug(issueSlug);
    setEditorialMessage("");

    try {
      const response = await fetch(`/api/admin/issues/${encodeURIComponent(issueSlug)}`, {
        method: "DELETE"
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(parseApiError(payload, "호수 삭제에 실패했습니다."));
      }

      setEditorialMessage("빈 호수와 표지 설정을 삭제했습니다.");
      router.refresh();
    } catch (error) {
      setEditorialMessage(`호수 삭제 실패: ${error.message}`);
    } finally {
      setPendingDeleteIssueSlug("");
    }
  }

  async function deleteArticle(slug, title) {
    if (!window.confirm(`기사 "${title}"만 삭제할까요? 댓글은 삭제되고, 연결 문제/제출 기록은 명예의 전당에 남겨 둡니다.`)) {
      return;
    }

    const response = await fetch(`/api/admin/articles/${slug}`, {
      method: "DELETE"
    });
    const payload = await response.json();

    if (!response.ok) {
      setEditorialMessage(parseApiError(payload, "기사 삭제에 실패했습니다."));
      return;
    }

    setEditorialMessage("기사만 삭제했습니다. 연결 문제는 보존했습니다.");
    router.refresh();
  }

  return (
    <div className="admin-grid">
      <section className="section-panel admin-wide">
        <div className="section-heading">
          <p className="eyebrow">호수 먼저 만들기</p>
          <span>admin 또는 teacher가 호수를 만든 뒤 기자가 선택합니다</span>
        </div>
        <form className="admin-form inline-admin-form" onSubmit={createIssue}>
          <label>
            <span>새 호수 이름</span>
            <input onChange={(event) => setIssueForm({ issue: event.target.value })} placeholder="예: 2026년 5월호" value={issueForm.issue} />
          </label>
          <button className="primary-button" disabled={pendingIssueCreate} type="submit">
            {pendingIssueCreate ? "생성 중..." : "호수 생성"}
          </button>
        </form>
      </section>

      <section className="section-panel admin-wide">
        <div className="section-heading">
          <p className="eyebrow">호수 공개 관리</p>
          <span>기사는 제출되고, 호수 단위로 공개/내리기 됩니다</span>
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
                <p className="status-note">{issue.coverImageSrc ? "표지 이미지 설정됨" : "표지 미설정 · PDF 기본 표지 사용"}</p>
                <form className="inline-upload-form" onSubmit={(event) => uploadCover(issue.issueSlug, event)}>
                  <input accept="image/png,image/jpeg,image/webp" name="file" type="file" />
                  <button className="ghost-button" disabled={pendingCoverIssueSlug === issue.issueSlug} type="submit">
                    {pendingCoverIssueSlug === issue.issueSlug ? "업로드 중..." : "표지 업로드"}
                  </button>
                  {issue.coverImageSrc ? (
                    <button className="ghost-button" onClick={() => clearCover(issue.issueSlug)} type="button">
                      표지 제거
                    </button>
                  ) : null}
                </form>
              </div>
              <div className="admin-score-controls">
                {issue.status === "published" ? (
                  <button className="ghost-button danger-button" onClick={() => unpublishIssue(issue.issueSlug)} type="button">
                    호 내리기
                  </button>
                ) : (
                  <button className="primary-button" disabled={issue.articleCount === 0} onClick={() => publishIssue(issue.issueSlug)} type="button">
                    호수 공개
                  </button>
                )}
                <button
                  className="ghost-button danger-button"
                  disabled={pendingDeleteIssueSlug === issue.issueSlug}
                  onClick={() => deleteIssue(issue.issueSlug, issue.issue)}
                  type="button"
                >
                  {pendingDeleteIssueSlug === issue.issueSlug ? "삭제 중..." : "호수 삭제"}
                </button>
              </div>
            </div>
          ))}
          {issues.length === 0 ? <p className="status-note">아직 생성된 호수가 없습니다. 먼저 호수를 만들어 주세요.</p> : null}
        </div>
        {editorialMessage ? <p className={editorialMessage.includes("실패") ? "error-note" : "status-note"}>{editorialMessage}</p> : null}
      </section>

      <section className="section-panel admin-wide">
        <div className="section-heading">
          <p className="eyebrow">기사 목록</p>
          <span>제출·공개 기사 삭제 관리</span>
        </div>
        <div className="story-list">
          {articles.map((article) => (
            <div className="story-row" key={article.slug}>
              <a href={`/articles/${article.slug}`}>
                <p className="story-tag">
                  {article.issue} · {article.status}
                </p>
                <h3>{article.title}</h3>
                <p>{article.deck}</p>
              </a>
              <span className="story-metric">
                {article.authorNickname}
                <br />
                {new Date(article.submittedAt ?? article.updatedAt).toLocaleDateString("ko-KR")}
                <br />
                <button className="ghost-button danger-button" onClick={() => deleteArticle(article.slug, article.title)} type="button">
                  기사만 삭제
                </button>
              </span>
            </div>
          ))}
          {articles.length === 0 ? <p className="status-note">아직 제출된 기사가 없습니다.</p> : null}
        </div>
      </section>
    </div>
  );
}

export function AdminHallPanel({ submissions }) {
  const router = useRouter();

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

  return (
    <section className="section-panel admin-wide">
      <div className="section-heading">
        <p className="eyebrow">풀이 채점</p>
        <span>문제 생성은 각 기사 상세에서 기자가 직접 진행합니다</span>
      </div>
      <p className="panel-note">어드민은 전체 제출물을 확인하고 보정 채점할 수 있습니다. 서술형 문제 작성자도 각 기사 상세에서 자신의 문제를 채점할 수 있습니다.</p>
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
              {submission.answerText ? <p className="submission-answer">답안: {submission.answerText}</p> : null}
              <p>
                {submission.originalFileName || "텍스트 답안"} · {submission.fileKind === "image" ? "이미지 제출" : submission.fileKind === "text" ? "텍스트 제출" : "PDF 제출"}
              </p>
              {submission.storedFileName ? (
                <a href={`/api/admin/hall-submissions/${submission.id}/file`} rel="noreferrer" target="_blank">
                  첨부 열기
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
        {submissions.length === 0 ? <p className="status-note">제출된 풀이가 없습니다.</p> : null}
      </div>
    </section>
  );
}
