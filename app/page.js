import Link from "next/link";
import { getHomepageData } from "@/lib/content";

export default async function HomePage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams?.q ?? "";
  const data = await getHomepageData(query);
  const latestIssue = data.issues[0] ?? (data.lead ? { issue: data.lead.issue, issueSlug: data.lead.issueSlug, articleCount: 1 } : null);
  const latestIssueHref = latestIssue ? `/issues/${latestIssue.issueSlug}` : "/issues";
  const leadHref = data.lead ? `/articles/${data.lead.slug}` : latestIssueHref;
  const issueDesk = [...data.issueFocus, ...data.popular].slice(0, 3);

  return (
    <div className="home-layout">
      <section className="hero-news">
        <article className="hero-news__main">
          <p className="kicker">Lead story · {data.lead?.issue ?? "Issue 07"}</p>
          <h1 className="headline-xl">{data.lead?.title ?? "MathZine의 첫 호를 준비 중입니다."}</h1>
          <p className="deck">
            {data.lead?.deck ?? "기사 데이터가 아직 없습니다. 수학 글, 호별 아카이브, 연결 문제를 하나의 읽기 경험으로 엮습니다."}
          </p>
          {data.lead ? (
            <div className="lead-meta">
              <span>{data.lead.authorNickname}</span>
              <span>{data.lead.readTime}</span>
              <span>{data.lead.likeCount} likes</span>
            </div>
          ) : null}
          <div className="metrics" aria-label="MathZine metrics">
            <div className="metric">
              <strong>{String(data.issues.length).padStart(2, "0")}</strong>
              <span>Core sections</span>
            </div>
            <div className="metric">
              <strong>{latestIssue?.issue ?? "1호"}</strong>
              <span>Issue flow</span>
            </div>
            <div className="metric">
              <strong>{data.archive.length}</strong>
              <span>Open reading</span>
            </div>
          </div>
          <div className="form-submit-row">
            <Link className="primary-button btn" href={leadHref}>
              대표 기사 읽기
            </Link>
            <Link className="ghost-button btn btn--ghost" href="/hall-of-fame">
              연결 문제 풀기
            </Link>
          </div>
        </article>

        <aside className="hero-news__side" aria-label="Issue desk">
          <Link className="issue-cover" href={latestIssueHref}>
            <div className="formula-mark">
              π<small>{latestIssue?.issue ?? "ISSUE"}</small>
            </div>
          </Link>
          <div className="rail-list">
            {issueDesk.map((article) => (
              <Link href={`/articles/${article.slug}`} key={article.slug}>
                <span className="label">{article.section ?? article.issue ?? "Issue desk"}</span>
                <strong>{article.title}</strong>
              </Link>
            ))}
            {!issueDesk.length ? <p className="status-note">편집 데스크를 준비 중입니다.</p> : null}
          </div>
        </aside>
      </section>

      <section className="section-panel section">
        <div className="section-heading section-title">
          <p className="kicker">Issue Archive</p>
          <Link href="/issues">전체 호 보기</Link>
        </div>
        <div className="issue-strip grid grid--4">
          {data.issues.map((issue) => (
            <Link className="issue-chip" href={`/issues/${issue.issueSlug}`} key={issue.issueSlug}>
              <p className="story-tag label">Issue</p>
              <strong>{issue.issue}</strong>
              <span>
                {issue.articleCount} articles · {new Date(issue.latestPublishedAt).toLocaleDateString("ko-KR")}
              </span>
            </Link>
          ))}
          {!data.issues.length ? <p className="status-note">아직 공개된 호수가 없습니다.</p> : null}
        </div>
      </section>

      <section className="two-column-grid grid grid--2">
        <div className="section-panel panel">
          <div className="section-heading section-title">
            <p className="kicker">인기 기사</p>
            <span>상위 2개 기사</span>
          </div>
          <div className="story-list">
            {data.popular.map((article) => (
              <Link className="story-row story-card" href={`/articles/${article.slug}`} key={article.slug}>
                <div>
                  <p className="story-tag label">
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
            {!data.popular.length ? <p className="status-note">인기 기사를 집계 중입니다.</p> : null}
          </div>
        </div>

        <div className="section-panel panel">
          <div className="section-heading section-title">
            <p className="kicker">Hall of fame</p>
            <Link href="/hall-of-fame">랭킹 페이지</Link>
          </div>
          <ol className="ranking-list rank">
            {data.hallOfFame.map((entry, index) => (
              <li className="rank__row" key={entry.nickname}>
                <b>{String(index + 1).padStart(2, "0")}</b>
                <span>
                  <strong>{entry.nickname}</strong>
                  <small>
                    {entry.score} pts · 우수 풀이 {entry.bestWriteups}회
                  </small>
                </span>
                <span>{entry.score}</span>
              </li>
            ))}
            {data.hallOfFame.length === 0 ? <li className="rank__row status-note">아직 점수가 반영된 풀이가 없습니다.</li> : null}
          </ol>
        </div>
      </section>

      <section className="four-up-grid grid grid--4">
        <Link className="portal-card story-card" href={latestIssueHref}>
          <p className="kicker">최신호</p>
          <h3>{latestIssue?.issue ?? "Issue 07"}</h3>
          <p>같은 호의 기사와 연결 문제를 한 번에 탐색할 수 있습니다.</p>
        </Link>
        <Link className="portal-card story-card" href="/hall-of-fame">
          <p className="kicker">명예의 전당</p>
          <h3>랭킹</h3>
          <p>문제 풀이 점수와 우수 풀이 기록을 모아 보여줍니다.</p>
        </Link>
        <Link className="portal-card story-card" href={data.popular[0] ? `/articles/${data.popular[0].slug}` : "/issues"}>
          <p className="kicker">인기 기사</p>
          <h3>{data.popular[0]?.title ?? "곧 채워집니다"}</h3>
          <p>{data.popular[0]?.excerpt ?? "발행된 기사와 함께 추천 영역이 활성화됩니다."}</p>
        </Link>
        <Link className="portal-card story-card" href="/board">
          <p className="kicker">게시판</p>
          <h3>커뮤니티</h3>
          <p>회원 의견과 어드민 공지를 분리해 읽기 쉽게 구성했습니다.</p>
        </Link>
      </section>

      <section className="section-panel section">
        <div className="section-heading section-title">
          <p className="kicker">Sections</p>
          <span>권한별 사용 안내</span>
        </div>
        <div className="archive-grid grid grid--4">
          <article className="archive-card story-card">
            <p className="story-tag label">일반 방문자</p>
            <h3>기사와 호별 아카이브 읽기</h3>
            <p>로그인 없이 기사, 호별 보기, 명예의 전당 랭킹을 둘러볼 수 있습니다.</p>
          </article>
          <article className="archive-card story-card">
            <p className="story-tag label">회원</p>
            <h3>댓글, 게시판, 풀이 제출</h3>
            <p>리로스쿨 인증 후 의견 작성, 좋아요, 문제 풀이 제출에 참여할 수 있습니다.</p>
          </article>
          <article className="archive-card story-card">
            <p className="story-tag label">기자</p>
            <h3>기사 작성과 제출</h3>
            <p>스튜디오에서 기사를 작성해 어드민 검토 대기 호수로 올립니다.</p>
          </article>
          <article className="archive-card story-card">
            <p className="story-tag label">교사 / 어드민</p>
            <h3>운영과 검토</h3>
            <p>호수 공개, 계정 관리, 명예의 전당 채점과 운영 기록을 관리합니다.</p>
          </article>
        </div>
      </section>

      <section className="news-columns grid grid--2">
        <div className="section-panel panel">
          <div className="section-heading section-title">
            <p className="kicker">이번 호의 기사</p>
            <span>{data.issueFocus[0]?.issue ?? "Issue 07"}</span>
          </div>
          {data.issueFocus.map((article) => (
            <Link className="column-story story-card" href={`/articles/${article.slug}`} key={article.slug}>
              <h3>{article.title}</h3>
              <p>{article.deck}</p>
            </Link>
          ))}
          {!data.issueFocus.length ? <p className="status-note">이번 호 기사 묶음이 없습니다.</p> : null}
        </div>

        <div className="section-panel panel">
          <div className="section-heading section-title">
            <p className="kicker">어드민 공지</p>
            <Link href="/board">모두 보기</Link>
          </div>
          {data.notices.map((post) => (
            <article className="bulletin story-card" key={post.id}>
              <p className="story-tag label">Notice</p>
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

      <section className="archive-panel section-panel section">
        <div className="section-heading section-title">
          <p className="kicker">아카이브</p>
          <p>{query ? `"${query}" 검색 결과` : "최근 발행 기사 전체"}</p>
        </div>
        <div className="archive-grid grid grid--4">
          {data.archive.map((article) => (
            <Link className="archive-card story-card" href={`/articles/${article.slug}`} key={article.slug}>
              <p className="story-tag label">
                {article.issue} · {article.section}
              </p>
              <h3>{article.title}</h3>
              <p>{article.excerpt}</p>
              <span>
                {article.readTime} · {new Date(article.publishedAt).toLocaleDateString("ko-KR")}
              </span>
            </Link>
          ))}
          {!data.archive.length ? <p className="status-note">표시할 기사가 없습니다.</p> : null}
        </div>
      </section>
    </div>
  );
}
