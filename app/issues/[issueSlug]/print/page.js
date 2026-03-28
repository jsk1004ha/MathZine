import { canManageAdmin, getCurrentUser } from "@/lib/auth";
import { getIssueBundle } from "@/lib/content";
import { getIssuePrintCss, renderIssuePrintBodyHtml } from "@/lib/issue-print";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Issue Print Preview | MathZine"
};

export default async function IssuePrintPreviewPage({ params }) {
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
    return (
      <div className="page-single">
        <section className="section-panel">
          <div className="section-heading">
            <p className="eyebrow">Print Preview</p>
            <h1>호수를 찾을 수 없습니다</h1>
          </div>
          <p>아직 공개되지 않았거나 존재하지 않는 호수입니다.</p>
        </section>
      </div>
    );
  }

  const html = await renderIssuePrintBodyHtml(bundle);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: getIssuePrintCss() }} />
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </>
  );
}
