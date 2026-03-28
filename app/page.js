import Link from "next/link";
import { getHomepageData } from "@/lib/content";

export default async function HomePage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams?.q ?? "";
  const data = await getHomepageData(query);
  const latestIssue = data.issues[0] ?? (data.lead ? { issue: data.lead.issue, issueSlug: data.lead.issueSlug, articleCount: 1 } : null);
  const latestIssueHref = latestIssue ? `/issues/${latestIssue.issueSlug}` : "/issues";

  return (
    <div className="home-layout">
      <section className="hero-grid">
        <article className="lead-story">
          <p className="eyebrow">{data.lead?.issue ?? "Issue 07"} · Lead Story</p>
          <h1>{data.lead?.title ?? "MathZine의 첫 호를 준비 중입니다."}</h1>
          <p className="lead-deck">{data.lead?.deck ?? "기사 데이터가 아직 없습니다."}</p>
          {data.lead ? (
            <div className="lead-meta">
              <span>{data.lead.authorNickname}</span>
              <span>{data.lead.readTime}</span>
              <span>{data.lead.likeCount} likes</span>
              <Link href={`/articles/${data.lead.slug}`}>기사 읽기</Link>
            </div>
          ) : null}
        </article>

        <Link className="latest-issue-card" href={latestIssueHref}>
          <p className="eyebrow">최신호</p>
          <h2>{latestIssue?.issue ?? "Issue 준비 중"}</h2>
          <p className="issue-copy">
            메인 기사, 연결 문제, 같은 호의 기사 묶음을 한 화면에서 바로 따라갈 수 있게 구성했습니다.
          </p>
          <p className="status-note">
            {query
              ? `"${query}" 검색 결과를 반영한 지면입니다.`
              : `${latestIssue?.articleCount ?? 0}개 기사로 편집된 최신호를 볼 수 있습니다.`}
          </p>
        </Link>
      </section>

      <section className="section-panel">
        <div className="section-heading">
          <p className="eyebrow">Issue Archive</p>
          <Link href="/issues">전체 호 보기</Link>
        </div>
        <div className="issue-strip">
          {data.issues.map((issue) => (
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

      <section className="two-column-grid">
        <div className="section-panel">
        <div className="section-heading">
          <p className="eyebrow">인기 기사</p>
          <span>상위 2개 기사</span>
        </div>
          <div className="story-list">
            {data.popular.map((article) => (
              <Link className="story-row" href={`/articles/${article.slug}`} key={article.slug}>
                <div>
                  <p className="story-tag">
                    {article.section} · {article.tag}
                  </p>
                  <h3>{article.title}</h3>
                  <p>{article.excerpt}</p>
                </div>
                <span className="story-metric">
                  {article.likeCount}♥ / {article.views} views
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="section-panel">
        <div className="section-heading">
          <p className="eyebrow">명예의 전당</p>
          <Link href="/hall-of-fame">랭킹 페이지</Link>
        </div>
          <ol className="ranking-list">
            {data.hallOfFame.map((entry, index) => (
              <li key={entry.nickname}>
                <span className="ranking-index">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <strong>{entry.nickname}</strong>
                  <p>
                    {entry.score} pts · 우수 풀이 {entry.bestWriteups}회
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="four-up-grid">
        <Link className="portal-card" href={latestIssueHref}>
          <p className="eyebrow">최신호</p>
          <h2>{latestIssue?.issue ?? "Issue 07"}</h2>
          <p>같은 호의 기사와 연결 문제를 한 번에 탐색할 수 있습니다.</p>
        </Link>
        <Link className="portal-card" href="/hall-of-fame">
          <p className="eyebrow">명예의 전당</p>
          <h2>랭킹</h2>
          <p>문제 풀이 점수와 우수 풀이 기록을 모아 보여줍니다.</p>
        </Link>
        <Link className="portal-card" href={data.popular[0] ? `/articles/${data.popular[0].slug}` : "/issues"}>
          <p className="eyebrow">인기 기사</p>
          <h2>{data.popular[0]?.title ?? "곧 채워집니다"}</h2>
          <p>{data.popular[0]?.excerpt ?? "발행된 기사와 함께 추천 영역이 활성화됩니다."}</p>
        </Link>
        <Link className="portal-card" href="/board">
          <p className="eyebrow">게시판</p>
          <h2>커뮤니티</h2>
          <p>회원 의견과 어드민 공지를 분리해 읽기 쉽게 구성했습니다.</p>
        </Link>
      </section>

      <section className="news-columns">
        <div className="section-panel">
          <div className="section-heading">
            <p className="eyebrow">이번 호의 기사</p>
            <span>{data.issueFocus[0]?.issue ?? "Issue 07"}</span>
          </div>
          {data.issueFocus.map((article) => (
            <Link className="column-story" href={`/articles/${article.slug}`} key={article.slug}>
              <h3>{article.title}</h3>
              <p>{article.deck}</p>
            </Link>
          ))}
        </div>

        <div className="section-panel">
          <div className="section-heading">
            <p className="eyebrow">어드민 공지</p>
            <Link href="/board">모두 보기</Link>
          </div>
          {data.notices.map((post) => (
            <article className="bulletin" key={post.id}>
              <p className="story-tag">Notice</p>
              <h3>{post.title}</h3>
              <p>{post.excerpt}</p>
              <span>
                {post.authorNickname} · {new Date(post.createdAt).toLocaleDateString("ko-KR")}
              </span>
            </article>
          ))}
          {data.notices.length === 0 ? <p className="status-note">등록된 공지가 없습니다.</p> : null}
        </div>
      </section>

      <section className="archive-panel">
        <div className="section-heading">
          <p className="eyebrow">아카이브</p>
          <p>{query ? `"${query}" 검색 결과` : "최근 발행 기사 전체"}</p>
        </div>
        <div className="archive-grid">
          {data.archive.map((article) => (
            <Link className="archive-card" href={`/articles/${article.slug}`} key={article.slug}>
              <p className="story-tag">
                {article.issue} · {article.section}
              </p>
              <h3>{article.title}</h3>
              <p>{article.excerpt}</p>
              <span>
                {article.readTime} · {new Date(article.publishedAt).toLocaleDateString("ko-KR")}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
