import Link from "next/link";
import { listArticles, listIssues } from "@/lib/content";

export const metadata = {
  title: "Issue Archive | MathZine",
  description: "MathZine 잡지 호별 아카이브"
};

export default async function IssuesArchivePage() {
  const [issues, articles] = await Promise.all([listIssues(), listArticles()]);
  const articleBySlug = new Map(articles.map((article) => [article.slug, article]));

  return (
    <div className="page-single">
      <section className="section-panel issue-hero">
        <p className="eyebrow">Issue Archive</p>
        <h1>호별로 묶인 MathZine 아카이브</h1>
        <p>각 호의 대표 기사와 수록 기사 수를 기준으로 전체 잡지 흐름을 한 번에 볼 수 있게 정리했습니다.</p>
      </section>

      <section className="section-panel">
        <div className="section-heading">
          <p className="eyebrow">All Issues</p>
          <span>{issues.length} issues</span>
        </div>
        <div className="issue-strip">
          {issues.map((issue) => (
            <Link className="issue-chip" href={`/issues/${issue.issueSlug}`} key={issue.issueSlug}>
              <p className="story-tag">Issue</p>
              <strong>{issue.issue}</strong>
              <span>
                {issue.articleCount} articles · {new Date(issue.latestPublishedAt).toLocaleDateString("ko-KR")}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="section-panel">
        <div className="section-heading">
          <p className="eyebrow">Lead Stories By Issue</p>
          <span>대표 기사 중심 보기</span>
        </div>
        <div className="archive-grid">
          {issues.map((issue) => {
            const leadArticle = articleBySlug.get(issue.leadSlug);

            return (
              <Link className="archive-card" href={`/issues/${issue.issueSlug}`} key={issue.issueSlug}>
                <p className="story-tag">{issue.issue}</p>
                <h3>{leadArticle?.title ?? "대표 기사 준비 중"}</h3>
                <p>{leadArticle?.deck ?? "해당 호의 기사와 연결 문제를 한 번에 탐색할 수 있습니다."}</p>
                <span>{issue.articleCount} articles</span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
