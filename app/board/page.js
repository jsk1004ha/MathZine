import { BoardComposer } from "@/components/board-composer";
import { canCreateNotice, getCurrentUser } from "@/lib/auth";
import { listBoardPosts } from "@/lib/content";

export default async function BoardPage() {
  const [posts, user] = await Promise.all([listBoardPosts(), getCurrentUser()]);
  const notices = posts.filter((post) => post.kind === "notice");
  const discussions = posts.filter((post) => post.kind !== "notice");

  return (
    <div className="page-single">
      {notices.length ? (
        <section className="section-panel">
          <div className="section-heading">
            <p className="eyebrow">어드민 공지</p>
            <h1>운영 공지와 일정</h1>
          </div>
          <div className="board-list">
            {notices.map((post) => (
              <article className="board-card notice-card" key={post.id}>
                <p className="story-tag">Notice</p>
                <h2>{post.title}</h2>
                <p>{post.excerpt}</p>
                <div className="board-body">{post.body}</div>
                <span>{post.authorNickname}</span>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="section-panel">
        <div className="section-heading">
          <p className="eyebrow">게시판</p>
          <h1>회원들이 의견을 나누는 공간</h1>
        </div>
        <div className="board-list">
          {discussions.map((post) => (
            <article className="board-card" key={post.id}>
              <p className="story-tag">{new Date(post.createdAt).toLocaleDateString("ko-KR")}</p>
              <h2>{post.title}</h2>
              <p>{post.excerpt}</p>
              <div className="board-body">{post.body}</div>
              <span>{post.authorNickname}</span>
            </article>
          ))}
        </div>
      </section>

      <BoardComposer canCreateNotice={canCreateNotice(user)} canPost={Boolean(user)} />
    </div>
  );
}
