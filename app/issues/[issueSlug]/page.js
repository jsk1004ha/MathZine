import Link from "next/link";
import { canManageAdmin, getCurrentUser } from "@/lib/auth";
import { getIssueBundle } from "@/lib/content";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { issueSlug: rawIssueSlug } = await params;
  const issueSlug = decodeURIComponent(rawIssueSlug);
  const user = await getCurrentUser();
  let bundle = await getIssueBundle(issueSlug);

  if (!bundle && user) {
    const previewBundle = await getIssueBundle(issueSlug, { includeUnpublished: true, viewer: user });

    if (previewBundle && (canManageAdmin(user) || previewBundle.articles.some((article) => article.authorId === user.id))) {
      bundle = previewBundle;
    }
  }

  if (!bundle) {
    return { title: "호 없음 | MathZine" };
  }

  return {
    title: `${bundle.issue} | MathZine`,
    description: `${bundle.issue}에 실린 기사 모음`
  };
}

export default async function IssuePage({ params }) {
  const { issueSlug: rawIssueSlug } = await params;
  const issueSlug = decodeURIComponent(rawIssueSlug);
  const user = await getCurrentUser();
  let bundle = await getIssueBundle(issueSlug);
  let isPreview = false;

  if (!bundle && user) {
    const previewBundle = await getIssueBundle(issueSlug, { includeUnpublished: true, viewer: user });

    if (previewBundle && (canManageAdmin(user) || previewBundle.articles.some((article) => article.authorId === user.id))) {
      bundle = previewBundle;
      isPreview = previewBundle.status !== "published";
    }
  }

  if (!bundle) {
    return (
      <div className="page-single">
        <section className="section-panel">
          <div className="section-heading">
            <p className="eyebrow">Issue Archive</p>
            <h1>호수를 찾을 수 없습니다</h1>
          </div>
          <p>아직 공개되지 않았거나 존재하지 않는 호수입니다.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="page-single">
      <section className="section-panel issue-hero">
        <p className="eyebrow">Issue Archive</p>
        <h1>{bundle.issue}</h1>
        <p>한 호에 실린 기사와 연결된 문제를 한 번에 탐색할 수 있도록 정리했습니다.</p>
        {isPreview ? <p className="status-note">이 호수는 아직 공개 전이며 작성자와 어드민만 볼 수 있습니다.</p> : null}
        <div className="issue-actions">
          <a className="primary-button" href={`/api/issues/${bundle.issueSlug}/pdf`}>
            이 호수 PDF 다운로드
          </a>
        </div>
      </section>

      <section className="section-panel">
        <div className="section-heading">
          <p className="eyebrow">이번 호 기사</p>
          <span>{bundle.articles.length} articles</span>
        </div>
        <div className="archive-grid">
          {bundle.articles.map((article) => (
            <Link className="archive-card" href={`/articles/${article.slug}`} key={article.slug}>
              <p className="story-tag">
                {article.section} · {article.tag}
              </p>
              <h3>{article.title}</h3>
              <p>{article.deck}</p>
              <span>{article.readTime}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
