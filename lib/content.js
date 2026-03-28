import { randomUUID } from "node:crypto";
import { readCollection, writeCollection } from "@/lib/store";
import { extractPlainTextFromDocument, getDocumentPullQuote, sanitizeArticleDocument } from "@/lib/article-blocks";
import { assertUserNotBanned, canCreateNotice, canPreviewArticle, canWriteArticles } from "@/lib/auth";
import { sanitizeText, slugify, splitParagraphs } from "@/lib/security";

function sortByDate(items, selector) {
  return [...items].sort((left, right) => new Date(selector(right)) - new Date(selector(left)));
}

function countComments(comments, slug) {
  return comments.filter((comment) => comment.articleSlug === slug).length;
}

function enrichArticle(article, comments) {
  return {
    ...article,
    likeCount: article.likeUserIds.length,
    commentCount: countComments(comments, article.slug),
    score: article.views + article.likeUserIds.length * 12 + countComments(comments, article.slug) * 8
  };
}

export function normalizeIssueSlug(issue) {
  const source = sanitizeText(issue, { maxLength: 80 });
  if (!source) {
    return "";
  }

  return slugify(source) || source.toLowerCase().replace(/\s+/g, "-");
}

function matchesIssueSlug(issue, targetIssueSlug) {
  const target = normalizeIssueSlug(targetIssueSlug);

  if (!target) {
    return false;
  }

  return (
    normalizeIssueSlug(issue?.issueSlug) === target ||
    normalizeIssueSlug(issue?.issue) === target
  );
}

function articleBelongsToIssue(article, issue) {
  const articleIssueSlug = normalizeIssueSlug(article?.issueSlug || article?.issue);
  const issueIssueSlug = normalizeIssueSlug(issue?.issueSlug || issue?.issue);
  return Boolean(articleIssueSlug && issueIssueSlug && articleIssueSlug === issueIssueSlug);
}

function documentToParagraphs(document) {
  return splitParagraphs(extractPlainTextFromDocument(document));
}

function articleSortDate(article) {
  return article.publishedAt || article.submittedAt || article.updatedAt || article.createdAt || new Date(0).toISOString();
}

function textHaystackForArticle(article) {
  return [
    article.title,
    article.deck,
    article.section,
    article.tag,
    article.authorNickname,
    article.issue,
    ...(article.content ?? []),
    article.document ? extractPlainTextFromDocument(article.document) : ""
  ]
    .join(" ")
    .toLowerCase();
}

function matchesSearchTerm(haystack, searchTerm) {
  const normalized = sanitizeText(searchTerm, { maxLength: 80 }).toLowerCase();
  return !normalized || haystack.includes(normalized);
}

function deriveIssueYear(issue) {
  const fromLabel = String(issue?.issue ?? "").match(/(20\d{2})/);

  if (fromLabel?.[1]) {
    return fromLabel[1];
  }

  const stamp = issue?.publishedAt || issue?.latestPublishedAt || issue?.updatedAt || issue?.createdAt;

  if (!stamp) {
    return "";
  }

  return String(new Date(stamp).getFullYear());
}

function issueSearchHaystack(issue, issueArticles) {
  return [
    issue.issue,
    ...issueArticles.flatMap((article) => [article.title, article.deck, article.section, article.tag, article.authorNickname])
  ]
    .join(" ")
    .toLowerCase();
}

function createIssueRecord(issue, issueSlug) {
  const timestamp = new Date().toISOString();

  return {
    id: `issue_${issueSlug}`,
    issue,
    issueSlug,
    status: "draft",
    createdAt: timestamp,
    updatedAt: timestamp,
    publishedAt: null
  };
}

function isArticlePublic(article, issueMap) {
  const issue = issueMap.get(article.issueSlug);
  return article.status === "published" && (!issue || issue.status === "published");
}

function canAccessArticle(article, issueMap, viewer, includeUnpublished = false) {
  if (includeUnpublished || isArticlePublic(article, issueMap)) {
    return true;
  }

  return canPreviewArticle(viewer, article);
}

async function loadCollections() {
  const [articles, comments, hallProblems, issues] = await Promise.all([
    readCollection("articles"),
    readCollection("comments"),
    readCollection("hallProblems"),
    readCollection("issues")
  ]);

  return {
    articles,
    comments,
    hallProblems,
    issues,
    issueMap: new Map(issues.map((issue) => [issue.issueSlug, issue]))
  };
}

export async function listArticles(options = {}) {
  const { includeUnpublished = false, viewer = null, searchTerm = "", section = "", issue = "", sort = "latest" } = options;
  const { articles, comments, issueMap } = await loadCollections();
  const normalizedSection = sanitizeText(section, { maxLength: 30 }).toLowerCase();
  const normalizedIssue = sanitizeText(issue, { maxLength: 40 }).toLowerCase();
  let nextArticles = articles
    .filter((article) => canAccessArticle(article, issueMap, viewer, includeUnpublished))
    .map((article) => enrichArticle(article, comments))
    .filter((article) => {
      if (normalizedSection && article.section.toLowerCase() !== normalizedSection) {
        return false;
      }

      if (normalizedIssue && article.issue.toLowerCase() !== normalizedIssue) {
        return false;
      }

      return matchesSearchTerm(textHaystackForArticle(article), searchTerm);
    });

  if (sort === "popular") {
    nextArticles = [...nextArticles].sort((left, right) => right.score - left.score || new Date(articleSortDate(right)) - new Date(articleSortDate(left)));
  } else {
    nextArticles = sortByDate(nextArticles, articleSortDate);
  }

  return nextArticles;
}

export async function getArticleBySlug(slug, options = {}) {
  const { includeUnpublished = false, viewer = null } = options;
  const { articles, comments, hallProblems, issueMap } = await loadCollections();
  const article = articles.find((entry) => entry.slug === slug);

  if (!article || !canAccessArticle(article, issueMap, viewer, includeUnpublished)) {
    return null;
  }

  const linkedProblems = hallProblems.filter(
    (problem) => problem.articleSlug === slug || (article.linkedProblemIds ?? []).includes(problem.id)
  );

  return {
    ...enrichArticle(article, comments),
    linkedProblems
  };
}

export async function listCommentsForArticle(slug) {
  const comments = await readCollection("comments");
  return sortByDate(
    comments.filter((comment) => comment.articleSlug === slug),
    (comment) => comment.createdAt
  ).reverse();
}

export async function addComment(slug, user, body) {
  assertUserNotBanned(user);
  const commentBody = sanitizeText(body, { maxLength: 500, multiline: true });

  if (!commentBody) {
    throw new Error("댓글 내용을 입력해 주세요.");
  }

  const [comments, articles, issues] = await Promise.all([
    readCollection("comments"),
    readCollection("articles"),
    readCollection("issues")
  ]);
  const issueMap = new Map(issues.map((issue) => [issue.issueSlug, issue]));
  const article = articles.find((entry) => entry.slug === slug);

  if (!article || !isArticlePublic(article, issueMap)) {
    throw new Error("댓글을 달 기사를 찾을 수 없습니다.");
  }

  const newComment = {
    id: `comment_${randomUUID()}`,
    articleSlug: slug,
    userId: user.id,
    authorNickname: user.nickname,
    body: commentBody,
    createdAt: new Date().toISOString()
  };

  comments.push(newComment);
  await writeCollection("comments", comments);

  return newComment;
}

export async function incrementArticleViews(slug) {
  const [articles, issues] = await Promise.all([readCollection("articles"), readCollection("issues")]);
  const issueMap = new Map(issues.map((issue) => [issue.issueSlug, issue]));
  const index = articles.findIndex((article) => article.slug === slug);

  if (index === -1 || !isArticlePublic(articles[index], issueMap)) {
    throw new Error("기사를 찾을 수 없습니다.");
  }

  articles[index] = {
    ...articles[index],
    views: articles[index].views + 1
  };

  await writeCollection("articles", articles);
  return articles[index].views;
}

export async function toggleArticleLike(slug, userId) {
  const [articles, comments, issues] = await Promise.all([
    readCollection("articles"),
    readCollection("comments"),
    readCollection("issues")
  ]);
  const issueMap = new Map(issues.map((issue) => [issue.issueSlug, issue]));
  const index = articles.findIndex((article) => article.slug === slug);

  if (index === -1 || !isArticlePublic(articles[index], issueMap)) {
    throw new Error("기사를 찾을 수 없습니다.");
  }

  const likeUserIds = new Set(articles[index].likeUserIds);

  if (likeUserIds.has(userId)) {
    likeUserIds.delete(userId);
  } else {
    likeUserIds.add(userId);
  }

  articles[index] = {
    ...articles[index],
    likeUserIds: [...likeUserIds]
  };

  await writeCollection("articles", articles);

  const enriched = enrichArticle(articles[index], comments);
  return {
    liked: likeUserIds.has(userId),
    likeCount: enriched.likeCount
  };
}

export async function listBoardPosts(options = {}) {
  const { kind = "", searchTerm = "", sort = "latest" } = options;
  const posts = await readCollection("boardPosts");
  const normalizedKind = sanitizeText(kind, { maxLength: 20 }).toLowerCase();
  const filtered = posts.filter((post) => {
    if (normalizedKind && post.kind !== normalizedKind) {
      return false;
    }

    return matchesSearchTerm(
      [post.title, post.excerpt, post.body, post.authorNickname].join(" ").toLowerCase(),
      searchTerm
    );
  });

  if (sort === "oldest") {
    return [...filtered].sort((left, right) => new Date(left.createdAt) - new Date(right.createdAt));
  }

  return sortByDate(filtered, (post) => post.createdAt);
}

export async function createBoardPost(payload, user) {
  assertUserNotBanned(user);
  const title = sanitizeText(payload.title, { maxLength: 80 });
  const excerpt = sanitizeText(payload.excerpt, { maxLength: 140 });
  const body = sanitizeText(payload.body, { maxLength: 1200, multiline: true });
  const wantsNotice = payload.kind === "notice";
  const kind = wantsNotice ? "notice" : "discussion";

  if (wantsNotice && !canCreateNotice(user)) {
    throw new Error("공지 작성 권한이 없습니다.");
  }

  if (!title || !excerpt || !body) {
    throw new Error("게시판 글의 제목, 요약, 본문을 모두 입력해 주세요.");
  }

  const posts = await readCollection("boardPosts");
  const nextPost = {
    id: `board_${randomUUID()}`,
    kind,
    title,
    excerpt,
    body,
    authorId: user.id,
    authorNickname: user.nickname,
    createdAt: new Date().toISOString()
  };

  posts.push(nextPost);
  await writeCollection("boardPosts", posts);
  return nextPost;
}

export async function createArticle(payload, user) {
  assertUserNotBanned(user);
  if (!canWriteArticles(user)) {
    throw new Error("기사 작성은 기자 또는 어드민만 가능합니다.");
  }

  const title = sanitizeText(payload.title, { maxLength: 100 });
  const deck = sanitizeText(payload.deck, { maxLength: 220 });
  const section = sanitizeText(payload.section, { maxLength: 30 });
  const tag = sanitizeText(payload.tag, { maxLength: 30 });
  const issue = sanitizeText(payload.issue, { maxLength: 40 });
  const readTime = sanitizeText(payload.readTime, { maxLength: 20 });
  const document = payload.document
    ? sanitizeArticleDocument(payload.document)
    : sanitizeArticleDocument({
        blocks: splitParagraphs(payload.body).map((paragraph, index) => ({
          id: `legacy_${index + 1}`,
          type: "paragraph",
          style: index === 0 ? "lead" : "body",
          text: paragraph,
          referenceIds: []
        })),
        references: []
      });
  const paragraphs = documentToParagraphs(document);

  if (!title || !deck || !section || !tag || !issue || !readTime || document.blocks.length < 1 || paragraphs.length < 1) {
    throw new Error("기사 제목, 데크, 섹션, 태그, 호수, 읽기 시간, 본문 블록이 필요합니다.");
  }

  const [articles, issues] = await Promise.all([readCollection("articles"), readCollection("issues")]);
  let slug = slugify(title);

  if (!slug) {
    slug = `article-${randomUUID().slice(0, 8)}`;
  }

  if (articles.some((article) => article.slug === slug)) {
    slug = `${slug}-${Date.now().toString().slice(-4)}`;
  }

  const submittedAt = new Date().toISOString();
  const issueSlug = normalizeIssueSlug(issue);
  const existingIssue = issues.find((entry) => entry.issueSlug === issueSlug);

  if (existingIssue?.status === "published") {
    throw new Error("이미 공개된 호수입니다. 새 호수를 지정하거나 어드민에게 새 발행 묶음을 요청해 주세요.");
  }

  const nextArticle = {
    id: `article_${randomUUID()}`,
    slug,
    title,
    deck,
    section,
    tag,
    issue,
    issueSlug,
    location: "MathZine Newsroom",
    readTime,
    submittedAt,
    publishedAt: null,
    updatedAt: submittedAt,
    status: "submitted",
    authorId: user.id,
    authorNickname: user.nickname,
    document,
    excerpt: deck,
    pullQuote: getDocumentPullQuote(document) || paragraphs[0],
    heroTone: "ink",
    views: 0,
    likeUserIds: [],
    linkedProblemIds: [],
    content: paragraphs
  };

  articles.push(nextArticle);
  await writeCollection("articles", articles);

  const nextIssues = [...issues];
  const issueIndex = nextIssues.findIndex((entry) => entry.issueSlug === issueSlug);

  if (issueIndex === -1) {
    nextIssues.push(createIssueRecord(issue, issueSlug));
  } else {
    nextIssues[issueIndex] = {
      ...nextIssues[issueIndex],
      issue,
      updatedAt: submittedAt
    };
  }

  await writeCollection("issues", nextIssues);
  return nextArticle;
}

export async function listArticlesByAuthor(userId) {
  const [articles, comments] = await Promise.all([readCollection("articles"), readCollection("comments")]);
  return sortByDate(
    articles.filter((article) => article.authorId === userId),
    articleSortDate
  ).map((article) => enrichArticle(article, comments));
}

export async function listEditorialArticles() {
  const [articles, comments] = await Promise.all([readCollection("articles"), readCollection("comments")]);
  return sortByDate(articles, articleSortDate).map((article) => enrichArticle(article, comments));
}

export async function listIssues(options = {}) {
  const { searchTerm = "", year = "", sort = "latest" } = options;
  const issues = await readCollection("issues");
  const articles = await listArticles();
  const normalizedYear = sanitizeText(year, { maxLength: 4 });
  const mapped = issues
    .filter((issue) => issue.status === "published")
    .map((issue) => {
      const issueArticles = articles.filter((article) => articleBelongsToIssue(article, issue));

      if (!issueArticles.length) {
        return null;
      }

      const yearLabel = deriveIssueYear(issue);

      return {
        issue: issue.issue,
        issueSlug: issue.issueSlug,
        status: issue.status,
        articleCount: issueArticles.length,
        latestPublishedAt: issueArticles[0].publishedAt,
        leadSlug: issueArticles[0].slug,
        year: yearLabel,
        sections: [...new Set(issueArticles.map((article) => article.section))],
        leadTitle: issueArticles[0].title
      };
    })
    .filter(Boolean)
    .filter((issue) => {
      if (normalizedYear && issue.year !== normalizedYear) {
        return false;
      }

      const issueArticles = articles.filter((article) => article.issueSlug === issue.issueSlug);
      return matchesSearchTerm(issueSearchHaystack(issue, issueArticles), searchTerm);
    });

  if (sort === "oldest") {
    return [...mapped].sort((left, right) => new Date(left.latestPublishedAt) - new Date(right.latestPublishedAt));
  }

  if (sort === "size") {
    return [...mapped].sort((left, right) => right.articleCount - left.articleCount || new Date(right.latestPublishedAt) - new Date(left.latestPublishedAt));
  }

  return sortByDate(mapped, (issue) => issue.latestPublishedAt);
}

export async function listEditorialIssues() {
  const [issues, articles] = await Promise.all([readCollection("issues"), readCollection("articles")]);

  return sortByDate(
    issues.map((issue) => {
      const issueArticles = articles.filter((article) => articleBelongsToIssue(article, issue));
      const submittedCount = issueArticles.filter((article) => article.status === "submitted").length;
      const publishedCount = issueArticles.filter((article) => article.status === "published").length;
      const lead = sortByDate(issueArticles, articleSortDate)[0] ?? null;

      return {
        ...issue,
        articleCount: issueArticles.length,
        submittedCount,
        publishedCount,
        leadSlug: lead?.slug ?? null,
        leadTitle: lead?.title ?? ""
      };
    }),
    (issue) => issue.updatedAt || issue.createdAt
  );
}

export async function publishIssue(issueSlug) {
  const [issues, articles] = await Promise.all([readCollection("issues"), readCollection("articles")]);
  const issueIndex = issues.findIndex((issue) => matchesIssueSlug(issue, issueSlug));

  if (issueIndex === -1) {
    throw new Error("호수를 찾을 수 없습니다.");
  }

  const issueArticles = articles.filter((article) => articleBelongsToIssue(article, issues[issueIndex]));

  if (!issueArticles.length) {
    throw new Error("이 호수에 연결된 기사가 없습니다.");
  }

  const publishedAt = new Date().toISOString();
  const nextArticles = articles.map((article) =>
    articleBelongsToIssue(article, issues[issueIndex])
      ? {
          ...article,
          status: "published",
          publishedAt: article.publishedAt || publishedAt,
          updatedAt: publishedAt
        }
      : article
  );

  issues[issueIndex] = {
    ...issues[issueIndex],
    status: "published",
    updatedAt: publishedAt,
    publishedAt
  };

  await writeCollection("articles", nextArticles);
  await writeCollection("issues", issues);
  return issues[issueIndex];
}

export async function getIssueBundle(issueSlug, options = {}) {
  const { includeUnpublished = false, viewer = null } = options;
  const issues = includeUnpublished ? await listEditorialIssues() : await listIssues();
  const issue = issues.find((entry) => matchesIssueSlug(entry, issueSlug));

  if (!issue) {
    return null;
  }

  const articles = await listArticles({ includeUnpublished, viewer });
  const issueArticles = articles.filter((article) => articleBelongsToIssue(article, issue));

  if (!issueArticles.length) {
    return null;
  }

  return {
    issue: issue.issue,
    issueSlug: issue.issueSlug,
    status: issue.status,
    lead: issueArticles[0],
    articles: issueArticles
  };
}

export async function listHallProblems(options = {}) {
  const { includeUnpublished = false, viewer = null } = options;
  const [problems, articles, issues] = await Promise.all([
    readCollection("hallProblems"),
    readCollection("articles"),
    readCollection("issues")
  ]);
  const issueMap = new Map(issues.map((issue) => [issue.issueSlug, issue]));
  const articleMap = new Map(articles.map((article) => [article.slug, article]));

  return sortByDate(
    problems
      .map((problem) => {
        const article = articleMap.get(problem.articleSlug) ?? null;

        if (article && !canAccessArticle(article, issueMap, viewer, includeUnpublished)) {
          return null;
        }

        return {
          ...problem,
          article
        };
      })
      .filter(Boolean),
    (problem) => problem.createdAt
  );
}

export async function createHallProblem(payload) {
  const title = sanitizeText(payload.title, { maxLength: 90 });
  const articleSlug = sanitizeText(payload.articleSlug, { maxLength: 120 });
  const prompt = sanitizeText(payload.prompt, { maxLength: 1500, multiline: true });

  if (!title || !articleSlug || !prompt) {
    throw new Error("문제 제목, 연결 기사, 설명을 모두 입력해 주세요.");
  }

  const [problems, articles] = await Promise.all([readCollection("hallProblems"), readCollection("articles")]);
  const article = articles.find((entry) => entry.slug === articleSlug);

  if (!article) {
    throw new Error("연결할 기사를 찾지 못했습니다.");
  }

  const problem = {
    id: `problem_${randomUUID()}`,
    issue: article.issue,
    issueSlug: article.issueSlug,
    articleSlug,
    title,
    prompt,
    status: "open",
    createdAt: new Date().toISOString()
  };

  problems.push(problem);
  await writeCollection("hallProblems", problems);

  const updatedArticles = articles.map((entry) =>
    entry.slug === articleSlug
      ? { ...entry, linkedProblemIds: [...new Set([...(entry.linkedProblemIds ?? []), problem.id])] }
      : entry
  );

  await writeCollection("articles", updatedArticles);
  return problem;
}

export async function listHallSubmissions() {
  const [submissions, problems] = await Promise.all([
    readCollection("hallSubmissions"),
    readCollection("hallProblems")
  ]);

  return sortByDate(submissions, (submission) => submission.submittedAt).map((submission) => ({
    ...submission,
    problem: problems.find((problem) => problem.id === submission.problemId) ?? null
  }));
}

export async function createHallSubmission(payload, user) {
  assertUserNotBanned(user);
  const problemId = sanitizeText(payload.problemId, { maxLength: 80 });
  const originalFileName = sanitizeText(payload.originalFileName, { maxLength: 200 });
  const storedFileName = sanitizeText(payload.storedFileName, { maxLength: 260 });
  const fileKind = sanitizeText(payload.fileKind, { maxLength: 20 }) || "pdf";
  const mimeType = sanitizeText(payload.mimeType, { maxLength: 80 }) || "application/pdf";
  const fileSize = Number(payload.fileSize ?? 0);

  if (!problemId || !storedFileName || !originalFileName) {
    throw new Error("제출 파일과 연결된 문제 정보가 필요합니다.");
  }

  const [problems, submissions] = await Promise.all([
    readCollection("hallProblems"),
    readCollection("hallSubmissions")
  ]);

  const problem = problems.find((entry) => entry.id === problemId && entry.status === "open");

  if (!problem) {
    throw new Error("제출할 수 있는 문제를 찾지 못했습니다.");
  }

  const submission = {
    id: `submission_${randomUUID()}`,
    problemId,
    userId: user.id,
    nickname: user.nickname,
    originalFileName,
    storedFileName,
    fileKind,
    mimeType,
    fileSize,
    submittedAt: new Date().toISOString(),
    status: "submitted",
    awardedPoints: 0
  };

  submissions.push(submission);
  await writeCollection("hallSubmissions", submissions);
  return submission;
}

export async function scoreHallSubmission(submissionId, awardedPoints, status = "awarded") {
  const submissions = await readCollection("hallSubmissions");
  const index = submissions.findIndex((submission) => submission.id === submissionId);

  if (index === -1) {
    throw new Error("제출 내역을 찾을 수 없습니다.");
  }

  submissions[index] = {
    ...submissions[index],
    status,
    awardedPoints: Number.isFinite(awardedPoints) ? Math.max(0, awardedPoints) : 0
  };

  await writeCollection("hallSubmissions", submissions);
  return submissions[index];
}

export async function getHallRankings() {
  const submissions = await readCollection("hallSubmissions");
  const awarded = submissions.filter((submission) => submission.status === "awarded");
  const rankingMap = new Map();

  for (const submission of awarded) {
    const existing = rankingMap.get(submission.nickname) ?? {
      nickname: submission.nickname,
      score: 0,
      awardedCount: 0,
      bestWriteups: 0
    };

    existing.score += Number(submission.awardedPoints || 0);
    existing.awardedCount += 1;
    existing.bestWriteups += Number(submission.awardedPoints || 0) >= 12 ? 1 : 0;
    rankingMap.set(submission.nickname, existing);
  }

  return [...rankingMap.values()].sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    return right.bestWriteups - left.bestWriteups;
  });
}

export async function getHomepageData(searchTerm = "") {
  const [articles, boardPosts, hallRankings, issues] = await Promise.all([
    listArticles({ searchTerm }),
    listBoardPosts({ searchTerm }),
    getHallRankings(),
    listIssues()
  ]);
  const normalizedSearch = sanitizeText(searchTerm, { maxLength: 60 }).toLowerCase();
  const filteredArticles = articles;

  const lead = filteredArticles[0] ?? null;
  const notices = boardPosts.filter((post) => post.kind === "notice");
  const discussions = boardPosts.filter((post) => post.kind !== "notice");

  return {
    searchTerm: normalizedSearch,
    lead,
    latest: filteredArticles.slice(0, 4),
    popular: [...filteredArticles].sort((left, right) => right.score - left.score).slice(0, 2),
    hallOfFame: hallRankings.slice(0, 3),
    issues: issues.slice(0, 4),
    notices: notices.slice(0, 3),
    boardPosts: discussions.slice(0, 4),
    issueFocus: filteredArticles.filter((article) => article.issue === (lead?.issue ?? "")).slice(0, 3),
    archive: filteredArticles.slice(0, 8)
  };
}

export async function searchSite(searchTerm, options = {}) {
  const { section = "", issue = "", sort = "latest" } = options;
  const [articles, boardPosts, issues] = await Promise.all([
    listArticles({ searchTerm, section, issue, sort }),
    listBoardPosts({ searchTerm }),
    listIssues()
  ]);
  const normalizedSearch = sanitizeText(searchTerm, { maxLength: 60 });

  return {
    searchTerm: normalizedSearch,
    articles,
    boardPosts,
    filters: {
      section: sanitizeText(section, { maxLength: 30 }),
      issue: sanitizeText(issue, { maxLength: 40 }),
      sort: sort === "popular" ? "popular" : "latest"
    },
    availableSections: [...new Set(articles.map((article) => article.section))].sort(),
    availableIssues: issues.map((entry) => entry.issue)
  };
}

export async function getArticlePageBundle(slug, options = {}) {
  const { includeUnpublished = false, viewer = null } = options;
  const { articles, comments, hallProblems, issueMap } = await loadCollections();
  const article = articles.find((entry) => entry.slug === slug);

  if (!article || !canAccessArticle(article, issueMap, viewer, includeUnpublished)) {
    return null;
  }

  const linkedProblems = hallProblems.filter(
    (problem) => problem.articleSlug === slug || (article.linkedProblemIds ?? []).includes(problem.id)
  );
  const articleComments = sortByDate(
    comments.filter((comment) => comment.articleSlug === slug),
    (comment) => comment.createdAt
  ).reverse();
  const enrichedArticle = enrichArticle(article, comments);
  const related = articles
    .filter((entry) => entry.slug !== slug && canAccessArticle(entry, issueMap, viewer, includeUnpublished))
    .map((entry) => enrichArticle(entry, comments))
    .map((entry) => ({
      ...entry,
      relevance:
        (entry.issueSlug === enrichedArticle.issueSlug ? 20 : 0) +
        (entry.section === enrichedArticle.section ? 12 : 0) +
        (entry.tag === enrichedArticle.tag ? 8 : 0) +
        Math.min(entry.likeCount, 12)
    }))
    .sort((left, right) => right.relevance - left.relevance || new Date(articleSortDate(right)) - new Date(articleSortDate(left)))
    .slice(0, 4);

  return {
    article: {
      ...enrichedArticle,
      linkedProblems
    },
    comments: articleComments,
    related
  };
}

export async function getProfileActivity(userId) {
  const [articles, boardPosts, comments, submissions] = await Promise.all([
    listArticlesByAuthor(userId),
    readCollection("boardPosts"),
    readCollection("comments"),
    listHallSubmissions()
  ]);

  return {
    articles: articles.slice(0, 8),
    boardPosts: sortByDate(boardPosts.filter((post) => post.authorId === userId), (post) => post.createdAt).slice(0, 8),
    comments: sortByDate(comments.filter((comment) => comment.userId === userId), (comment) => comment.createdAt).slice(0, 8),
    submissions: submissions.filter((submission) => submission.userId === userId).slice(0, 8)
  };
}
