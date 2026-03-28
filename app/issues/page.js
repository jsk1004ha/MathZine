import Link from "next/link";
import { listArticles, listIssues } from "@/lib/content";

export const metadata = {
  title: "Issue Archive | MathZine",
  description: "MathZine 잡지 호별 아카이브"
};

export default async function IssuesArchivePage({ searchParams }) {
  const params = await searchParams;
  const query = params?.q ?? "";
  const year = params?.year ?? "";
  const sort = params?.sort ?? "latest";
  const [issues, articles] = await Promise.all([
    listIssues({ searchTerm: query, year, sort }),
    listArticles()
  ]);
  const articleBySlug = new Map(articles.map((article) => [article.slug, article]));
  const years = [...new Set(issues.map((issue) => issue.year).filter(Boolean))].sort((left, right) => right.localeCompare(left));

  return (
    <div className="page-single">
      <section className="section-panel issue-hero">
        <p className="eyebrow">Issue Archive</p>
        <h1>호별로 묶인 MathZine 아카이브</h1>
        <p>각 호의 대표 기사와 수록 기사 수를 기준으로 전체 잡지 흐름을 한 번에 볼 수 있게 정리했습니다.</p>
      </section>

      <section className="section-panel">
        <div className="section-heading">
          <p className="eyebrow">Archive Filters</p>
          <span>{issues.length} issues</span>
        </div>
        <form action="/issues" className="search-form search-filter-form">
          <input defaultValue={query} name="q" placeholder="호수명, 대표 기사, 섹션 검색" type="search" />
          <select defaultValue={year} name="year">
            <option value="">전체 연도</option>
            {years.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
          <select defaultValue={sort} name="sort">
            <option value="latest">최신 발행순</option>
            <option value="oldest">오래된순</option>
            <option value="size">기사 수 많은순</option>
          </select>
          <button className="primary-button" type="submit">
            적용
          </button>
        </form>
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
              <span>{issue.sections.join(" · ")}</span>
            </Link>
          ))}
          {!issues.length ? <p className="status-note">조건에 맞는 호수가 없습니다.</p> : null}
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
                <span>{issue.articleCount} articles · {issue.sections.slice(0, 3).join(" · ")}</span>
              </Link>
            );
          })}
          {!issues.length ? <p className="status-note">표시할 호수가 없습니다.</p> : null}
        </div>
      </section>
    </div>
  );
}
