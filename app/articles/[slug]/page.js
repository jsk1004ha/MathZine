import { ArticleRenderer } from "@/components/article-renderer";
import { CommentForm } from "@/components/comment-form";
import { HallProblemForm } from "@/components/hall-problem-form";
import { HallSubmissionForm } from "@/components/hall-submission-form";
import { HallSubmissionReview } from "@/components/hall-submission-review";
import { LikeButton } from "@/components/like-button";
import { ViewTracker } from "@/components/view-tracker";
import { canCreateHallProblemForArticle, canPreviewArticle, getCurrentUser } from "@/lib/auth";
import { getArticleBySlug, getArticlePageBundle } from "@/lib/content";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);
  const user = await getCurrentUser();
  let article = await getArticleBySlug(slug);

  if (!article && user) {
    const previewArticle = await getArticleBySlug(slug, { includeUnpublished: true, viewer: user });

    if (previewArticle && canPreviewArticle(user, previewArticle)) {
      article = previewArticle;
    }
  }

  if (!article) {
    return { title: "기사 없음 | MathZine" };
  }

  return {
    title: `${article.title} | MathZine`,
    description: article.deck,
    alternates: {
      canonical: `/articles/${article.slug}`
    },
    openGraph: {
      title: article.title,
      description: article.deck,
      type: "article",
      url: `/articles/${article.slug}`
    }
  };
}

export default async function ArticlePage({ params }) {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);
  const user = await getCurrentUser();
  let article = await getArticleBySlug(slug);
  let isPreview = false;

  if (!article && user) {
    const previewArticle = await getArticleBySlug(slug, { includeUnpublished: true, viewer: user });

    if (previewArticle && canPreviewArticle(user, previewArticle)) {
      article = previewArticle;
      isPreview = previewArticle.status !== "published";
    }
  }

  if (!article) {
    return (
      <div className="page-single">
        <section className="section-panel panel">
          <div className="section-heading section-title">
            <p className="kicker">Article</p>
            <h1>기사를 찾을 수 없습니다</h1>
          </div>
          <p>주소가 잘못되었거나 아직 접근 권한이 없는 기사입니다.</p>
        </section>
      </div>
    );
  }

  const bundle = await getArticlePageBundle(slug, { includeUnpublished: isPreview, viewer: user });
  const comments = bundle?.comments ?? [];
  const related = bundle?.related ?? [];
  const linkedProblems = bundle?.article?.linkedProblems ?? article.linkedProblems ?? [];
  const liked = user ? article.likeUserIds.includes(user.id) : false;
  const canCreateProblem = canCreateHallProblemForArticle(user, article);
  const primaryProblem = linkedProblems[0];

  return (
    <div className="article-layout">
      {!isPreview ? <ViewTracker slug={article.slug} /> : null}
      <article className="article-shell">
        <aside className="toc" aria-label="기사 목차">
          <p className="kicker">In this article</p>
          <a href="#article-body">본문</a>
          <a href="#article-discussion">독자 반응</a>
          {linkedProblems.length || canCreateProblem ? <a href="#article-problems">연결 문제</a> : null}
          <div className="rail-list article-meta-rail">
            <span>{article.authorNickname}</span>
            <span>{article.readTime}</span>
            <span>{new Date(article.publishedAt || article.submittedAt).toLocaleDateString("ko-KR")}</span>
          </div>
        </aside>

        <main className="article-main" id="article-body">
          <header className="article-header">
            <p className="story-tag label">
              {isPreview ? article.issue : <a href={`/issues/${article.issueSlug}`}>{article.issue}</a>} · {article.section} · {article.tag}
            </p>
            <h1 className="headline-lg">{article.title}</h1>
            <p className="deck">{article.deck}</p>
            {isPreview ? <p className="status-note">이 기사는 아직 공개 전이며 작성자와 어드민만 미리 볼 수 있습니다.</p> : null}
          </header>

          <div className="article-body article-body-full editorial-article-body">
            <ArticleRenderer article={article} />
          </div>
        </main>

        <aside className="article-sidebar">
          <div className="metric-card panel">
            <p className="kicker">Reader index</p>
            <div className="metric-row">
              <span>조회수</span>
              <strong>{article.views}</strong>
            </div>
            <div className="metric-row">
              <span>댓글</span>
              <strong>{article.commentCount}</strong>
            </div>
            {!isPreview ? (
              <LikeButton canInteract={Boolean(user)} initialLikeCount={article.likeCount} initialLiked={liked} slug={article.slug} />
            ) : (
              <p className="inline-note">공개 전 기사에서는 반응 수집이 비활성화됩니다.</p>
            )}
          </div>

          {primaryProblem ? (
            <div className="problem-box">
              <p className="kicker">Attached problem</p>
              <h2>{primaryProblem.title}</h2>
              <p>{primaryProblem.prompt}</p>
              <a className="primary-button btn" href="#article-problems">
                문제 풀기
              </a>
            </div>
          ) : null}

          <div className="panel">
            <p className="kicker">다른 볼거리</p>
            <div className="rank">
              {related.slice(0, 3).map((entry, index) => (
                <a className="rank__row" href={`/articles/${entry.slug}`} key={entry.slug}>
                  <b>{String(index + 1).padStart(2, "0")}</b>
                  <span>{entry.title}</span>
                  <span>read</span>
                </a>
              ))}
              {!related.length ? <p className="inline-note">같이 읽을 다른 기사가 아직 없습니다.</p> : null}
            </div>
          </div>
        </aside>
      </article>

      <section className="section-panel comments-panel" id="article-discussion">
        <div className="section-heading section-title">
          <p className="kicker">Discussion</p>
          <span>{comments.length} comments</span>
        </div>
        {isPreview ? <p className="inline-note">댓글은 호수가 공개된 뒤부터 받을 수 있습니다.</p> : <CommentForm canComment={Boolean(user)} slug={article.slug} />}
        {!isPreview ? (
          <div className="comment-list">
            {comments.map((comment) => (
              <article className="comment-card story-card" key={comment.id}>
                <div className="comment-header">
                  <strong>{comment.authorNickname}</strong>
                  <span>{new Date(comment.createdAt).toLocaleString("ko-KR")}</span>
                </div>
                <p>{comment.body}</p>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      {linkedProblems.length || canCreateProblem ? (
        <section className="section-panel" id="article-problems">
          <div className="section-heading section-title">
            <p className="kicker">이 기사와 연결된 문제</p>
            <span>접었다 펼쳐서 풀이</span>
          </div>
          <p className="panel-note">문제는 기본적으로 접혀 있어 기사 읽기를 방해하지 않습니다. 필요할 때만 펼쳐서 풀거나 제출하면 됩니다.</p>
          {canCreateProblem ? <HallProblemForm articleSlug={article.slug} /> : null}
          <div className="story-list">
            {linkedProblems.map((problem) => (
              <details className="article-problem-details" key={problem.id}>
                <summary>
                  <span>
                    {problem.type === "multiple_choice" ? "객관식" : problem.type === "short_answer" ? "주관식" : "서술형"} · {problem.points ?? 10}점
                  </span>
                  <strong>{problem.title}</strong>
                </summary>
                <article className="archive-card problem-card">
                  <p className="story-tag label">{problem.issue}</p>
                  <h3>{problem.title}</h3>
                  <p>{problem.prompt}</p>
                  <HallSubmissionForm canSubmit={Boolean(user)} problem={problem} />
                  {problem.canGrade ? <HallSubmissionReview problem={problem} /> : null}
                </article>
              </details>
            ))}
            {!linkedProblems.length ? <p className="status-note">아직 연결된 문제가 없습니다.</p> : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
