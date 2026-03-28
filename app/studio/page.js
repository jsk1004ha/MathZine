import Link from "next/link";
import { redirect } from "next/navigation";
import { StudioForm } from "@/components/studio-form";
import { canWriteArticles, getCurrentUser } from "@/lib/auth";
import { listArticlesByAuthor } from "@/lib/content";

export default async function StudioPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!canWriteArticles(user)) {
    return (
      <div className="page-single">
        <section className="section-panel">
          <div className="section-heading">
            <p className="eyebrow">권한 필요</p>
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

  const articles = await listArticlesByAuthor(user.id);

  return (
    <div className="page-single">
      <section className="studio-hero">
        <p className="eyebrow">Reporter Studio</p>
        <h1>뉴스룸 스타일로 기사를 제출하세요</h1>
        <p>사진, 영상, 링크, 콜아웃, 정리, 증명, 수식, 코드, 각주를 블록 단위로 조합하고 우측 프리뷰에서 바로 확인할 수 있습니다.</p>
      </section>

      <StudioForm />

      <section className="section-panel">
        <div className="section-heading">
          <p className="eyebrow">내가 쓴 기사</p>
          <span>{articles.length} articles</span>
        </div>
        <div className="archive-grid">
          {articles.map((article) => (
            <Link className="archive-card" href={`/articles/${article.slug}`} key={article.slug}>
              <p className="story-tag">
                {article.issue} · {article.status}
              </p>
              <h3>{article.title}</h3>
              <p>{article.excerpt}</p>
              <span>
                {article.authorNickname} · {article.publishedAt ? "공개됨" : "검토 대기"}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
