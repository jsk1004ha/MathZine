import { BoardComposer } from "@/components/board-composer";
import { canCreateNotice, getCurrentUser } from "@/lib/auth";
import { listBoardPosts } from "@/lib/content";

export const metadata = {
  title: "Board | MathZine",
  description: "MathZine 게시판"
};

export default async function BoardPage({ searchParams }) {
  const params = await searchParams;
  const query = params?.q ?? "";
  const kind = params?.kind ?? "all";
  const sort = params?.sort ?? "latest";
  const [posts, user] = await Promise.all([
    listBoardPosts({
      searchTerm: query,
      kind: kind === "all" ? "" : kind,
      sort
    }),
    getCurrentUser()
  ]);
  const notices = kind === "discussion" ? [] : posts.filter((post) => post.kind === "notice");
  const discussions = kind === "notice" ? [] : posts.filter((post) => post.kind !== "notice");

  return (
    <div className="page-single">
      <section className="section-panel">
        <div className="section-heading">
          <p className="eyebrow">Board Search</p>
          <span>{posts.length} results</span>
        </div>
        <form action="/board" className="search-form search-filter-form">
          <input defaultValue={query} name="q" placeholder="제목, 요약, 본문, 닉네임 검색" type="search" />
          <select defaultValue={kind} name="kind">
            <option value="all">전체 글</option>
            <option value="discussion">일반 의견</option>
            <option value="notice">공지</option>
          </select>
          <select defaultValue={sort} name="sort">
            <option value="latest">최신순</option>
            <option value="oldest">오래된순</option>
          </select>
          <button className="primary-button" type="submit">
            적용
          </button>
        </form>
      </section>

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
      ) : kind === "notice" || query ? (
        <section className="section-panel">
          <div className="section-heading">
            <p className="eyebrow">어드민 공지</p>
            <h1>운영 공지와 일정</h1>
          </div>
          <p className="status-note">조건에 맞는 공지가 없습니다.</p>
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
          {!discussions.length ? <p className="status-note">조건에 맞는 게시글이 없습니다.</p> : null}
        </section>

      <BoardComposer canCreateNotice={canCreateNotice(user)} canPost={Boolean(user)} />
    </div>
  );
}
