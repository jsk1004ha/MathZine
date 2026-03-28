import Link from "next/link";
import { searchSite } from "@/lib/content";

export const metadata = {
  title: "Search | MathZine",
  description: "MathZine 기사와 게시판 검색"
};

export default async function SearchPage({ searchParams }) {
  const params = await searchParams;
  const query = params?.q ?? "";
  const section = params?.section ?? "";
  const issue = params?.issue ?? "";
  const sort = params?.sort ?? "latest";
  const results = await searchSite(query, { section, issue, sort });

  return (
    <div className="page-single">
      <section className="section-panel issue-hero">
        <p className="eyebrow">Search</p>
        <h1>검색 결과</h1>
        <p>{results.searchTerm ? `"${results.searchTerm}"에 대한 기사와 게시판 결과입니다.` : "검색어를 입력해 주세요."}</p>
      </section>

      <section className="section-panel">
        <form action="/search" className="search-form search-filter-form">
          <input defaultValue={results.searchTerm} name="q" placeholder="제목, 본문, 태그, 닉네임 검색" type="search" />
          <select defaultValue={results.filters.section} name="section">
            <option value="">모든 섹션</option>
            {results.availableSections.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
          <select defaultValue={results.filters.issue} name="issue">
            <option value="">모든 호수</option>
            {results.availableIssues.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
          <select defaultValue={results.filters.sort} name="sort">
            <option value="latest">최신순</option>
            <option value="popular">인기순</option>
          </select>
          <button className="primary-button" type="submit">
            검색
          </button>
        </form>
      </section>

      <section className="section-panel">
        <div className="section-heading">
          <p className="eyebrow">기사 결과</p>
          <span>{results.articles.length} articles</span>
        </div>
        <div className="archive-grid">
          {results.articles.map((article) => (
            <Link className="archive-card" href={`/articles/${article.slug}`} key={article.id}>
              <p className="story-tag">{article.issue} · {article.section}</p>
              <h3>{article.title}</h3>
              <p>{article.deck}</p>
              <span>{article.likeCount} likes · {article.views} views</span>
            </Link>
          ))}
          {!results.articles.length ? <p className="status-note">기사 검색 결과가 없습니다.</p> : null}
        </div>
      </section>

      <section className="section-panel">
        <div className="section-heading">
          <p className="eyebrow">게시판 결과</p>
          <span>{results.boardPosts.length} posts</span>
        </div>
        <div className="board-list">
          {results.boardPosts.map((post) => (
            <article className="board-card" key={post.id}>
              <p className="story-tag">{post.kind === "notice" ? "Notice" : "Discussion"}</p>
              <h2>{post.title}</h2>
              <p>{post.excerpt}</p>
              <span>{post.authorNickname}</span>
            </article>
          ))}
          {!results.boardPosts.length ? <p className="status-note">게시판 검색 결과가 없습니다.</p> : null}
        </div>
      </section>
    </div>
  );
}
