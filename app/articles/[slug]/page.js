import { ArticleRenderer } from "@/components/article-renderer";
import { CommentForm } from "@/components/comment-form";
import { HallSubmissionForm } from "@/components/hall-submission-form";
import { LikeButton } from "@/components/like-button";
import { ViewTracker } from "@/components/view-tracker";
import { canPreviewArticle, getCurrentUser } from "@/lib/auth";
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
        <section className="section-panel">
          <div className="section-heading">
            <p className="eyebrow">Article</p>
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
  const liked = user ? article.likeUserIds.includes(user.id) : false;

  return (
    <div className="article-layout">
      {!isPreview ? <ViewTracker slug={article.slug} /> : null}
      <article className="article-shell">
        <header className="article-header">
          <p className="story-tag">
            {isPreview ? article.issue : <a href={`/issues/${article.issueSlug}`}>{article.issue}</a>} · {article.section} · {article.tag}
          </p>
          <h1>{article.title}</h1>
          <p className="lead-deck">{article.deck}</p>
          {isPreview ? <p className="status-note">이 기사는 아직 공개 전이며 작성자와 어드민만 미리 볼 수 있습니다.</p> : null}
          <div className="lead-meta">
            <span>{article.authorNickname}</span>
            <span>{article.readTime}</span>
            <span>{new Date(article.publishedAt || article.submittedAt).toLocaleDateString("ko-KR")}</span>
          </div>
        </header>

        <div className={`article-hero tone-${article.heroTone}`}>
          <div>
            <span className="eyebrow">Feature Preview</span>
            <h2>{article.pullQuote}</h2>
          </div>
        </div>

        <div className="article-body-grid">
          <div className="article-body article-body-full editorial-article-body">
            <ArticleRenderer article={article} className="editorial-columns" />
          </div>
        </div>
      </article>

      <section className="article-action-grid">
        <div className="metric-card">
          <p className="eyebrow">반응</p>
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

        <div className="metric-card">
            <p className="eyebrow">다른 볼거리</p>
          <div className="related-story-list">
            {related.map((entry) => (
              <a href={`/articles/${entry.slug}`} key={entry.slug}>
                {entry.title}
              </a>
            ))}
            {!related.length ? <p className="inline-note">같이 읽을 다른 기사가 아직 없습니다.</p> : null}
          </div>
        </div>
      </section>

      {article.linkedProblems.length ? (
        <section className="section-panel">
          <div className="section-heading">
            <p className="eyebrow">이 기사와 연결된 문제</p>
            <span>PDF 풀이 제출</span>
          </div>
          <div className="story-list">
            {article.linkedProblems.map((problem) => (
              <article className="archive-card" key={problem.id}>
                <p className="story-tag">{problem.issue}</p>
                <h3>{problem.title}</h3>
                <p>{problem.prompt}</p>
                <HallSubmissionForm canSubmit={Boolean(user)} problem={problem} />
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="section-panel comments-panel">
        <div className="section-heading">
          <p className="eyebrow">댓글 창</p>
          <span>{comments.length} comments</span>
        </div>
        {isPreview ? <p className="inline-note">댓글은 호수가 공개된 뒤부터 받을 수 있습니다.</p> : <CommentForm canComment={Boolean(user)} slug={article.slug} />}
        {!isPreview ? (
          <div className="comment-list">
            {comments.map((comment) => (
              <article className="comment-card" key={comment.id}>
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
    </div>
  );
}
