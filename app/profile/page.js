import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ProfilePasswordForm } from "@/components/profile-password-form";
import { getProfileActivity } from "@/lib/content";

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const activity = await getProfileActivity(user.id);

  return (
    <div className="page-single">
      <section className="profile-card">
        <p className="eyebrow">Profile</p>
        <h1>{user.nickname}</h1>
        <dl className="profile-grid">
          <div>
            <dt>닉네임</dt>
            <dd>{user.nickname}</dd>
          </div>
          <div>
            <dt>이름</dt>
            <dd>{user.name}</dd>
          </div>
          <div>
            <dt>학번</dt>
            <dd>{user.studentNumber || "공개 안 함"}</dd>
          </div>
          <div>
            <dt>로그인 방식</dt>
            <dd>{user.authProvider === "local" ? "직접 생성 계정" : "리로스쿨"}</dd>
          </div>
          <div>
            <dt>권한</dt>
            <dd>{user.role}</dd>
          </div>
        </dl>
      </section>

      <section className="section-panel">
        <div className="section-heading">
          <p className="eyebrow">내 활동</p>
          <h1>마이페이지 대시보드</h1>
        </div>
        <div className="admin-grid">
          <section className="section-panel">
            <div className="section-heading">
              <p className="eyebrow">작성 기사</p>
              <span>{activity.articles.length} items</span>
            </div>
            <div className="story-list">
              {activity.articles.length ? activity.articles.map((article) => (
                <a className="story-row" href={`/articles/${article.slug}`} key={article.id}>
                  <div>
                    <p className="story-tag">{article.issue} · {article.status}</p>
                    <h3>{article.title}</h3>
                  </div>
                  <span className="story-metric">{article.readTime}</span>
                </a>
              )) : <p className="status-note">작성한 기사가 없습니다.</p>}
            </div>
          </section>

          <section className="section-panel">
            <div className="section-heading">
              <p className="eyebrow">게시판 / 댓글</p>
              <span>{activity.boardPosts.length + activity.comments.length} items</span>
            </div>
            <div className="story-list">
              {activity.boardPosts.map((post) => (
                <article className="archive-card" key={post.id}>
                  <p className="story-tag">게시판 · {new Date(post.createdAt).toLocaleDateString("ko-KR")}</p>
                  <h3>{post.title}</h3>
                  <p>{post.excerpt}</p>
                </article>
              ))}
              {activity.comments.map((comment) => (
                <article className="archive-card" key={comment.id}>
                  <p className="story-tag">댓글 · {new Date(comment.createdAt).toLocaleDateString("ko-KR")}</p>
                  <p>{comment.body}</p>
                </article>
              ))}
              {!activity.boardPosts.length && !activity.comments.length ? <p className="status-note">남긴 활동이 없습니다.</p> : null}
            </div>
          </section>
        </div>

        <section className="section-panel">
          <div className="section-heading">
            <p className="eyebrow">풀이 제출 상태</p>
            <span>{activity.submissions.length} items</span>
          </div>
          <div className="story-list">
            {activity.submissions.length ? activity.submissions.map((submission) => (
              <article className="archive-card" key={submission.id}>
                <p className="story-tag">{submission.problem?.title ?? "문제"} · {submission.status}</p>
                <h3>{submission.originalFileName}</h3>
                <p>{submission.awardedPoints} pts · {submission.fileKind === "image" ? "이미지" : "PDF"}</p>
              </article>
            )) : <p className="status-note">제출한 풀이가 없습니다.</p>}
          </div>
        </section>
      </section>

      {user.authProvider === "local" ? <ProfilePasswordForm /> : null}
    </div>
  );
}
