import Link from "next/link";
import { redirect } from "next/navigation";
import { StudioForm } from "@/components/studio-form";
import { canWriteArticles, getCurrentUser } from "@/lib/auth";
import { listArticlesByAuthor, listWritableIssues } from "@/lib/content";

export default async function StudioPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!canWriteArticles(user)) {
    return (
      <div className="page-single">
        <section className="section-panel panel">
          <div className="section-heading section-title">
            <p className="kicker">권한 필요</p>
            <h1>기사 작성은 기자 계정만 가능합니다</h1>
          </div>
          <p>
            현재 역할은 <strong>{user.role}</strong> 입니다. 어드민 화면에서 `reporter` 또는 `admin` 권한을
            부여하면 이 스튜디오를 사용할 수 있습니다.
          </p>
        </section>
      </div>
    );
  }

  const [articles, writableIssues] = await Promise.all([listArticlesByAuthor(user.id), listWritableIssues()]);
  const latestArticle = articles[0];

  return (
    <div className="page-single">
      <section className="studio-hero section">
        <p className="kicker">Reporter Studio</p>
        <h1 className="headline-lg">HTML 문서로 기사를 작성하고, 같은 iframe 렌더러로 미리 봅니다.</h1>
        <p className="deck">
          MathZine의 새 기사 포맷은 블록 편집기와 HTML 모드를 모두 지원합니다. 이 화면은 제목, 데크, 호수,
          높이, 검토 상태를 한 번에 다루는 편집 데스크입니다.
        </p>
      </section>

      <section className="studio-shell">
        <aside className="studio-sidebar" aria-label="Writer status">
          <div className="studio-panel">
            <p className="kicker">Writer status</p>
            <div className="rank">
              <div className="rank__row">
                <b>권한</b>
                <span>{user.role}</span>
                <span>필수</span>
              </div>
              <div className="rank__row">
                <b>상태</b>
                <span>{latestArticle?.status ?? "draft"}</span>
                <span>{latestArticle ? "검토" : "대기"}</span>
              </div>
              <div className="rank__row">
                <b>공개</b>
                <span>/admin/editorial</span>
                <span>편집부</span>
              </div>
            </div>
          </div>

          <div className="studio-panel">
            <p className="kicker">Submit checks</p>
            <div className="studio-checklist">
              <span className="check-item is-done">제목</span>
              <span className="check-item is-done">데크</span>
              <span className="check-item is-done">HTML</span>
              <span className="check-item is-done">높이</span>
            </div>
            <p className="inline-note">작성 내용은 브라우저 임시저장 후 편집부에 제출됩니다.</p>
          </div>

          <div className="studio-panel">
            <div className="section-heading section-title">
              <p className="kicker">내가 쓴 기사</p>
              <span>{articles.length} articles</span>
            </div>
            <div className="submission-queue">
              {articles.map((article) => (
                <Link href={`/articles/${article.slug}`} key={article.slug}>
                  <span className="label">{article.issue} · {article.status}</span>
                  <strong>{article.title}</strong>
                </Link>
              ))}
              {!articles.length ? <p className="inline-note">아직 제출한 기사가 없습니다.</p> : null}
            </div>
          </div>
        </aside>

        <div className="studio-main">
          <StudioForm availableIssues={writableIssues} />
        </div>
      </section>
    </div>
  );
}
