import { getCurrentUser } from "@/lib/auth";
import { getHallRankings, listHallProblems, listHallSubmissions } from "@/lib/content";

export default async function HallOfFamePage() {
  const [rankings, problems, submissions, user] = await Promise.all([
    getHallRankings(),
    listHallProblems(),
    listHallSubmissions(),
    getCurrentUser()
  ]);

  return (
    <div className="page-single">
      <section className="section-panel">
        <div className="section-heading">
          <p className="eyebrow">명예의 전당</p>
          <h1>좋은 풀이에 점수를 주는 문제 랭킹</h1>
        </div>
        <ol className="hall-list">
          {rankings.map((entry, index) => (
            <li className="hall-item" key={entry.nickname}>
              <span className="ranking-index">{String(index + 1).padStart(2, "0")}</span>
              <div className="hall-main">
                <p className="story-tag">Score Ranking</p>
                <strong>{entry.nickname}</strong>
                <p>우수 풀이 점수와 채택 횟수를 기준으로 정렬합니다.</p>
                <div className="hall-metrics">
                  <span>{entry.score} pts</span>
                  <span>채택 {entry.awardedCount}회</span>
                  <span>우수 풀이 {entry.bestWriteups}회</span>
                </div>
              </div>
            </li>
          ))}
          {rankings.length === 0 ? <p className="status-note">아직 점수가 반영된 풀이가 없습니다.</p> : null}
        </ol>
      </section>

      <div className="two-column-grid hall-detail-grid">
        <section className="section-panel">
          <div className="section-heading">
            <p className="eyebrow">연결된 문제</p>
            <span>{problems.length} problems</span>
          </div>
          <div className="story-list">
            {problems.map((problem) => (
              <article className="archive-card" key={problem.id}>
                <p className="story-tag">{problem.issue}</p>
                <h3>{problem.title}</h3>
                <p>{problem.prompt}</p>
                {problem.article ? <a href={`/articles/${problem.article.slug}`}>문제가 실린 기사 보기</a> : null}
              </article>
            ))}
            {problems.length === 0 ? <p className="status-note">등록된 문제가 없습니다.</p> : null}
          </div>
        </section>

        <section className="section-panel">
          <div className="section-heading">
            <p className="eyebrow">최근 제출</p>
            <span>{user ? "기사 상세에서 PDF, 사진, 노트 제출 가능" : "로그인 후 기사 상세에서 풀이 제출 가능"}</span>
          </div>
          <div className="board-list">
            {submissions.slice(0, 8).map((submission) => (
              <article className="board-card" key={submission.id}>
                <p className="story-tag">{submission.problem?.title ?? "문제"}</p>
                <h2>{submission.nickname}</h2>
                <p>
                  {submission.originalFileName} · {submission.fileKind === "image" ? "이미지" : "PDF"}
                </p>
                <span>
                  {submission.status} · {submission.awardedPoints} pts
                </span>
              </article>
            ))}
            {submissions.length === 0 ? <p className="status-note">아직 제출 기록이 없습니다.</p> : null}
          </div>
        </section>
      </div>
    </div>
  );
}
