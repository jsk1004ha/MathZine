import Link from "next/link";
import { getHomepageData } from "@/lib/content";

function formatDate(value) {
  if (!value) {
    return "발행 대기";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "발행 대기";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric"
  }).format(date);
}

function IssueCoverArt({ issue, variant = "portrait" }) {
  const label = issue?.issue ?? "Issue";
  const articleCount = issue?.articleCount ?? 0;
  const coverNumber = Number.parseInt(String(label).match(/\d+/)?.[0] ?? "0", 10);
  const coverTones = ["teal", "gold", "cyan", "violet"];
  const coverTone = coverTones[(Number.isNaN(coverNumber) ? 0 : coverNumber) % coverTones.length];
  const coverClassName = `mz-issue-cover-art mz-issue-cover-art--${variant} mz-issue-cover-art--tone-${coverTone}`;

  if (issue?.coverImageSrc) {
    return (
      <span className={`${coverClassName} mz-issue-cover-art--uploaded`}>
        <img alt={`${label} 표지`} className="mz-cover-image" src={issue.coverImageSrc} />
      </span>
    );
  }

  return (
    <span
      className={coverClassName}
      role="img"
      aria-label={`${label} 표지`}
    >
      <span className="mz-cover-field" aria-hidden="true">
        <svg className="mz-cover-math" viewBox="0 0 400 520" preserveAspectRatio="none" focusable="false">
          <path className="mz-cover-grid-line" d="M-10 122 C78 64 160 71 232 118 S342 179 410 109" />
          <path className="mz-cover-grid-line" d="M-12 190 C72 142 142 158 218 206 S337 281 414 218" />
          <path className="mz-cover-wave-main" d="M-20 292 C44 218 100 371 167 294 S290 195 422 300" />
          <path className="mz-cover-wave-soft" d="M-18 323 C72 254 128 345 205 300 S322 234 420 314" />
          <path className="mz-cover-spiral" d="M235 176 C252 132 320 128 337 178 C360 246 268 296 211 250 C140 192 184 78 286 64 C357 54 395 86 416 122" />
          <path className="mz-cover-fractal" d="M78 410 L118 344 L158 410 M98 377 L138 377 M118 344 L118 292 M118 292 L94 252 M118 292 L146 252" />
          <path className="mz-cover-fractal" d="M293 92 L333 156 L253 156 Z M293 92 L293 40 M293 40 L268 18 M293 40 L321 18" />
        </svg>
        <span className="mz-cover-orbit mz-cover-orbit--one" />
        <span className="mz-cover-orbit mz-cover-orbit--two" />
        <span className="mz-cover-equation mz-cover-equation--a">∑</span>
        <span className="mz-cover-equation mz-cover-equation--b">∫</span>
        <span className="mz-cover-equation mz-cover-equation--c">π</span>
        <span className="mz-cover-equation mz-cover-equation--d">φ</span>
      </span>
      <span className="mz-cover-brand">MathZine</span>
      <b className="mz-cover-issue">{label}</b>
      <span className="mz-cover-meta">{articleCount ? `${articleCount} articles` : "Issue cover"}</span>
    </span>
  );
}

export default async function HomePage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams?.q ?? "";
  const data = await getHomepageData(query);
  const latestIssue = data.issues[0] ?? (data.lead ? { issue: data.lead.issue, issueSlug: data.lead.issueSlug, articleCount: 1 } : null);
  const latestIssueHref = latestIssue ? `/issues/${latestIssue.issueSlug}` : "/issues";
  const leadHref = data.lead ? `/articles/${data.lead.slug}` : latestIssueHref;
  const issueRail = data.issues.slice(0, 6);
  const archiveArticles = data.archive.slice(0, 6);
  const archiveGroups = archiveArticles.reduce((groups, article) => {
    const issue = article.issue || "기타";
    const group = groups.find((item) => item.issue === issue);

    if (group) {
      group.articles.push(article);
      return groups;
    }

    groups.push({ issue, articles: [article] });
    return groups;
  }, []);

  return (
    <div className="magazine-home">
      <section className="mz-cinema-hero" aria-label="대표 기사">
        <Link className="mz-hero-media" href={leadHref}>
          <img alt="" src="/mathzine-media/hero-fractal-symbols.png" />
          <span className="mz-hero-copy">
            <strong>{data.lead?.title ?? "MathZine의 첫 호를 준비 중입니다."}</strong>
            <small>
              {data.lead?.deck ?? "수학 글, 호별 아카이브, 연결 문제를 하나의 읽기 경험으로 엮습니다."}
            </small>
          </span>
        </Link>
        <div className="mz-hero-actions">
          <Link className="mz-button mz-button--dark" href={leadHref}>
            대표 기사 읽기
          </Link>
          <Link className="mz-button mz-button--light" href="/hall-of-fame">
            문제 풀기
          </Link>
        </div>
      </section>

      <section className="mz-rail-section" aria-label="호별 표지">
        <div className="mz-rail-track">
          {issueRail.map((issue) => (
            <Link className="mz-rail-card mz-rail-card--issue" href={`/issues/${issue.issueSlug}`} key={issue.issueSlug}>
              <span>{formatDate(issue.latestPublishedAt || issue.publishedAt)}</span>
              <IssueCoverArt issue={issue} variant="portrait" />
              <strong>{issue.issue}</strong>
              <small>
                {issue.articleCount} articles · {issue.sections?.slice(0, 2).join(" · ") || issue.leadTitle || "표지 보기"}
              </small>
            </Link>
          ))}
          {!issueRail.length ? <p className="mz-empty">아직 공개된 호수가 없습니다.</p> : null}
        </div>
        <Link className="mz-rail-arrow" href="/issues" aria-label="전체 호 보기">
          <svg fill="none" height="24" viewBox="0 0 24 24" width="24">
            <path d="m9 5 7 7-7 7" stroke="currentColor" strokeLinecap="square" strokeWidth="1.8" />
          </svg>
        </Link>
      </section>

      <section className="mz-feature-band">
        <div className="mz-feature-panel mz-feature-panel--issue">
          <Link className="mz-issue-object" href={latestIssueHref}>
            <IssueCoverArt issue={latestIssue} variant="portrait" />
            {latestIssue?.coverImageSrc ? <span className="mz-issue-object-label">{latestIssue?.issue ?? "Issue"}</span> : null}
          </Link>
          <div className="mz-panel-copy">
            <p className="mz-section-label">Latest Issue</p>
            <h2>{latestIssue?.issue ?? "공개된 호수를 준비 중입니다"}</h2>
            <p>
              {latestIssue
                ? `${latestIssue.articleCount}개의 기사와 연결 문제를 한 호 안에서 읽습니다.`
                : "편집부가 첫 공개 호수를 준비하고 있습니다."}
            </p>
            <Link className="mz-text-link" href="/issues">
              호별 아카이브 보기
            </Link>
          </div>
        </div>

        <div className="mz-feature-panel">
          <div className="mz-panel-copy">
            <p className="mz-section-label">Hall of Fame</p>
            <h2>풀이 랭킹</h2>
          </div>
          <ol className="mz-rank-list">
            {data.hallOfFame.map((entry, index) => (
              <li key={entry.nickname}>
                <b>{String(index + 1).padStart(2, "0")}</b>
                <span>{entry.nickname}</span>
                <strong>{entry.score} pts</strong>
              </li>
            ))}
            {!data.hallOfFame.length ? <li className="mz-empty">아직 점수가 반영된 풀이가 없습니다.</li> : null}
          </ol>
          <Link className="mz-text-link" href="/hall-of-fame">
            명예의 전당으로
          </Link>
        </div>

        <div className="mz-feature-panel">
          <div className="mz-panel-copy">
            <p className="mz-section-label">Popular</p>
            <h2>많이 읽은 기사</h2>
          </div>
          <div className="mz-story-list">
            {data.popular.map((article) => (
              <Link href={`/articles/${article.slug}`} key={article.slug}>
                <span>{article.section} · {article.tag}</span>
                <strong>{article.title}</strong>
                <small>
                  {article.likeCount} likes · {article.views} views
                </small>
              </Link>
            ))}
            {!data.popular.length ? <p className="mz-empty">인기 기사를 집계 중입니다.</p> : null}
          </div>
        </div>

        <div className="mz-feature-panel">
          <div className="mz-panel-copy">
            <p className="mz-section-label">Board</p>
            <h2>공지와 토론</h2>
          </div>
          <div className="mz-story-list">
            {data.notices.map((post) => (
              <Link href="/board" key={post.id}>
                <span>Notice · {formatDate(post.createdAt)}</span>
                <strong>{post.title}</strong>
                <small>{post.authorNickname}</small>
              </Link>
            ))}
            {!data.notices.length ? <p className="mz-empty">등록된 공지가 없습니다.</p> : null}
          </div>
          <Link className="mz-text-link" href="/board">
            게시판 열기
          </Link>
        </div>
      </section>

      <section className="mz-archive-section">
        <div className="mz-section-heading">
          <p className="mz-section-label">Archive</p>
          <h2>{query ? `"${query}" 검색 결과` : "최근 발행 기사"}</h2>
          <Link className="mz-text-link" href="/search">
            검색으로 더 보기
          </Link>
        </div>
        <div className="mz-archive-groups">
          {archiveGroups.map((group) => (
            <section aria-label={`${group.issue} 기사`} className="mz-archive-group" key={group.issue}>
              <div className="mz-archive-group-heading">
                <strong>{group.issue}</strong>
                <small>{group.articles.length} articles</small>
              </div>
              <div className="mz-archive-grid">
                {group.articles.map((article) => (
                  <Link className="mz-archive-card" href={`/articles/${article.slug}`} key={article.slug}>
                    <span>{article.section}</span>
                    <strong>{article.title}</strong>
                    <p>{article.excerpt}</p>
                    <small>
                      {article.readTime} · {formatDate(article.publishedAt)}
                    </small>
                  </Link>
                ))}
              </div>
            </section>
          ))}
          {!archiveArticles.length ? <p className="mz-empty">표시할 기사가 없습니다.</p> : null}
        </div>
      </section>
    </div>
  );
}
