import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import Database from "better-sqlite3";

const storageDir = path.join(process.cwd(), "storage");
export const uploadsDir = path.join(storageDir, "uploads");
const dbPath = path.join(storageDir, "mathzine.db");

const legacyFilePaths = {
  users: path.join(storageDir, "users.json"),
  sessions: path.join(storageDir, "sessions.json"),
  articles: path.join(storageDir, "articles.json"),
  comments: path.join(storageDir, "comments.json"),
  boardPosts: path.join(storageDir, "board-posts.json"),
  hallProblems: path.join(storageDir, "hall-problems.json"),
  hallSubmissions: path.join(storageDir, "hall-submissions.json"),
  issues: path.join(storageDir, "issues.json")
};

const defaults = {
  users: [],
  sessions: [],
  articles: [],
  comments: [],
  boardPosts: [],
  hallProblems: [],
  hallSubmissions: [],
  issues: []
};

const tableConfigs = {
  users: { table: "users", key: "id" },
  sessions: { table: "sessions", key: "token" },
  articles: { table: "articles", key: "id" },
  comments: { table: "comments", key: "id" },
  boardPosts: { table: "board_posts", key: "id" },
  hallProblems: { table: "hall_problems", key: "id" },
  hallSubmissions: { table: "hall_submissions", key: "id" },
  issues: { table: "issues", key: "id" }
};

const legacyProblemArticleMap = {
  problem_07_1: "issue-07-euler-theorem-city-paths",
  problem_07_2: "issue-07-primes-and-school-cryptography"
};

let database;
let ensured = false;

function getDatabase() {
  if (!database) {
    database = new Database(dbPath);
    database.pragma("journal_mode = WAL");
    database.pragma("synchronous = NORMAL");
  }

  return database;
}

function createTables() {
  const db = getDatabase();

  for (const config of Object.values(tableConfigs)) {
    db.prepare(`CREATE TABLE IF NOT EXISTS ${config.table} (${config.key} TEXT PRIMARY KEY, payload TEXT NOT NULL)`).run();
  }
}

function getLegacySeed(name) {
  const filePath = legacyFilePaths[name];

  if (filePath && existsSync(filePath)) {
    try {
      return JSON.parse(readFileSync(filePath, "utf8"));
    } catch {}
  }

  return defaults[name];
}

function replaceCollection(name, items) {
  const db = getDatabase();
  const config = tableConfigs[name];
  const removeAll = db.prepare(`DELETE FROM ${config.table}`);
  const insert = db.prepare(`INSERT INTO ${config.table} (${config.key}, payload) VALUES (?, ?)`);

  db.transaction((rows) => {
    removeAll.run();

    for (const row of rows) {
      insert.run(String(row?.[config.key] ?? row?.id ?? randomUUID()), JSON.stringify(row));
    }
  })(items);
}

function loadCollection(name) {
  const db = getDatabase();
  const config = tableConfigs[name];
  return db
    .prepare(`SELECT payload FROM ${config.table} ORDER BY rowid ASC`)
    .all()
    .map((row) => JSON.parse(row.payload));
}

function countCollectionRows(name) {
  const db = getDatabase();
  const config = tableConfigs[name];
  return db.prepare(`SELECT COUNT(*) AS count FROM ${config.table}`).get().count;
}

export async function ensureStorage() {
  if (ensured) {
    return;
  }

  mkdirSync(storageDir, { recursive: true });
  mkdirSync(uploadsDir, { recursive: true });
  createTables();

  for (const name of Object.keys(tableConfigs)) {
    if (countCollectionRows(name) === 0) {
      replaceCollection(name, getLegacySeed(name));
    }
  }

  ensured = true;
  await migrateStorage();
}

async function migrateStorage() {
  const users = await readCollection("users");
  let changedUsers = false;

  const nextUsers = users.map((user, index) => {
    const nextUser = { ...user };

    if (!nextUser.nickname) {
      nextUser.nickname = user.name || `member${index + 1}`;
      changedUsers = true;
    }

    if (nextUser.role === "editor") {
      nextUser.role = "reporter";
      changedUsers = true;
    }

    if (!nextUser.role) {
      nextUser.role = "member";
      changedUsers = true;
    }

    if (!nextUser.authProvider) {
      nextUser.authProvider = "riro";
      changedUsers = true;
    }

    if (!nextUser.loginId) {
      nextUser.loginId = nextUser.authProvider === "local" ? `local-${index + 1}` : nextUser.riroId || `riro-${index + 1}`;
      changedUsers = true;
    }

    return nextUser;
  });

  if (nextUsers.length > 0 && !nextUsers.some((user) => user.role === "admin")) {
    nextUsers[0] = {
      ...nextUsers[0],
      role: "admin"
    };
    changedUsers = true;
  }

  if (changedUsers) {
    await writeCollection("users", nextUsers);
  }

  const boardPosts = await readCollection("boardPosts");
  let changedBoardPosts = false;
  const nextBoardPosts = boardPosts.map((post) => {
    const nextPost = { ...post };

    if (!nextPost.kind) {
      nextPost.kind = "discussion";
      changedBoardPosts = true;
    }

    if (!nextPost.authorNickname && nextPost.authorName) {
      nextPost.authorNickname = nextPost.authorName;
      delete nextPost.authorName;
      changedBoardPosts = true;
    }

    return nextPost;
  });

  if (changedBoardPosts) {
    await writeCollection("boardPosts", nextBoardPosts);
  }

  const comments = await readCollection("comments");
  let changedComments = false;
  const nextComments = comments.map((comment) => {
    const nextComment = { ...comment };

    if (!nextComment.authorNickname && nextComment.authorName) {
      nextComment.authorNickname = nextComment.authorName;
      delete nextComment.authorName;
      changedComments = true;
    }

    return nextComment;
  });

  if (changedComments) {
    await writeCollection("comments", nextComments);
  }

  const articles = await readCollection("articles");
  let changedArticles = false;
  let nextArticles = articles.map((article) => {
    const nextArticle = { ...article };

    if (!nextArticle.authorNickname && nextArticle.authorName) {
      nextArticle.authorNickname = nextArticle.authorName;
      delete nextArticle.authorName;
      changedArticles = true;
    }

    if (nextArticle.location === "MathZIne Newsroom") {
      nextArticle.location = "MathZine Newsroom";
      changedArticles = true;
    }

    if (!nextArticle.issueSlug && nextArticle.issue) {
      nextArticle.issueSlug = nextArticle.issue.toLowerCase().replace(/\s+/g, "-");
      changedArticles = true;
    }

    if (!Array.isArray(nextArticle.linkedProblemIds)) {
      nextArticle.linkedProblemIds = [];
      changedArticles = true;
    }

    if (!nextArticle.status) {
      nextArticle.status = "published";
      changedArticles = true;
    }

    if (!nextArticle.submittedAt) {
      nextArticle.submittedAt = nextArticle.updatedAt || nextArticle.publishedAt || new Date().toISOString();
      changedArticles = true;
    }

    if (Array.isArray(nextArticle.content)) {
      const nextContent = nextArticle.content.map((paragraph) =>
        typeof paragraph === "string" ? paragraph.replaceAll("MathZIne", "MathZine") : paragraph
      );

      if (JSON.stringify(nextContent) !== JSON.stringify(nextArticle.content)) {
        nextArticle.content = nextContent;
        changedArticles = true;
      }
    }

    return nextArticle;
  });

  const problems = await readCollection("hallProblems");
  let changedProblems = false;
  const nextProblems = problems.map((problem) => {
    const nextProblem = { ...problem };

    if (!nextProblem.issueSlug && nextProblem.issue) {
      nextProblem.issueSlug = nextProblem.issue.toLowerCase().replace(/\s+/g, "-");
      changedProblems = true;
    }

    if (typeof nextProblem.articleSlug === "undefined") {
      nextProblem.articleSlug = null;
      changedProblems = true;
    }

    if (!nextProblem.articleSlug && legacyProblemArticleMap[nextProblem.id]) {
      nextProblem.articleSlug = legacyProblemArticleMap[nextProblem.id];
      changedProblems = true;
    }

    return nextProblem;
  });

  if (changedProblems) {
    await writeCollection("hallProblems", nextProblems);
  }

  const problemIdsByArticleSlug = new Map();

  for (const problem of nextProblems) {
    if (!problem.articleSlug) {
      continue;
    }

    const linkedIds = problemIdsByArticleSlug.get(problem.articleSlug) ?? [];
    linkedIds.push(problem.id);
    problemIdsByArticleSlug.set(problem.articleSlug, linkedIds);
  }

  nextArticles = nextArticles.map((article) => {
    const inferredProblemIds = problemIdsByArticleSlug.get(article.slug) ?? [];
    const mergedProblemIds = [...new Set([...(article.linkedProblemIds ?? []), ...inferredProblemIds])];

    if (mergedProblemIds.length !== (article.linkedProblemIds ?? []).length) {
      changedArticles = true;
      return {
        ...article,
        linkedProblemIds: mergedProblemIds
      };
    }

    return article;
  });

  if (changedArticles) {
    await writeCollection("articles", nextArticles);
  }

  const issues = await readCollection("issues");
  const issueMap = new Map(issues.map((issue) => [issue.issueSlug, issue]));
  let changedIssues = false;

  for (const article of nextArticles) {
    if (!article.issueSlug || !article.issue) {
      continue;
    }

    const currentIssue = issueMap.get(article.issueSlug);

    if (!currentIssue) {
      issueMap.set(article.issueSlug, {
        id: `issue_${article.issueSlug}`,
        issue: article.issue,
        issueSlug: article.issueSlug,
        status: article.status === "published" ? "published" : "draft",
        createdAt: article.submittedAt || article.updatedAt || article.publishedAt || new Date().toISOString(),
        updatedAt: article.updatedAt || article.submittedAt || article.publishedAt || new Date().toISOString(),
        publishedAt: article.status === "published" ? article.publishedAt || article.updatedAt || article.submittedAt : null
      });
      changedIssues = true;
      continue;
    }

    const nextIssue = { ...currentIssue };

    if (!nextIssue.issue) {
      nextIssue.issue = article.issue;
      changedIssues = true;
    }

    if (!nextIssue.status) {
      nextIssue.status = article.status === "published" ? "published" : "draft";
      changedIssues = true;
    }

    if (nextIssue.status !== "published" && article.status === "published") {
      nextIssue.status = "published";
      nextIssue.publishedAt = article.publishedAt || article.updatedAt || article.submittedAt || null;
      changedIssues = true;
    }

    if (!nextIssue.createdAt) {
      nextIssue.createdAt = article.submittedAt || article.updatedAt || article.publishedAt || new Date().toISOString();
      changedIssues = true;
    }

    if (!nextIssue.updatedAt) {
      nextIssue.updatedAt = article.updatedAt || article.submittedAt || article.publishedAt || new Date().toISOString();
      changedIssues = true;
    }

    issueMap.set(article.issueSlug, nextIssue);
  }

  const nextIssues = [...issueMap.values()].map((issue) => ({
    id: issue.id || `issue_${issue.issueSlug}`,
    issue: issue.issue,
    issueSlug: issue.issueSlug,
    status: issue.status === "published" ? "published" : "draft",
    createdAt: issue.createdAt || new Date().toISOString(),
    updatedAt: issue.updatedAt || issue.createdAt || new Date().toISOString(),
    publishedAt: issue.status === "published" ? issue.publishedAt || issue.updatedAt || issue.createdAt : null
  }));

  if (changedIssues || nextIssues.length !== issues.length) {
    await writeCollection("issues", nextIssues);
  }

  const submissions = await readCollection("hallSubmissions");
  let changedSubmissions = false;
  const nextSubmissions = submissions.map((submission) => {
    const nextSubmission = { ...submission };

    if (typeof nextSubmission.originalFileName === "undefined") {
      nextSubmission.originalFileName = "legacy-submission.pdf";
      changedSubmissions = true;
    }

    if (typeof nextSubmission.storedFileName === "undefined") {
      nextSubmission.storedFileName = "";
      changedSubmissions = true;
    }

    if (typeof nextSubmission.fileSize === "undefined") {
      nextSubmission.fileSize = 0;
      changedSubmissions = true;
    }

    if (typeof nextSubmission.summary !== "undefined") {
      delete nextSubmission.summary;
      changedSubmissions = true;
    }

    return nextSubmission;
  });

  if (changedSubmissions) {
    await writeCollection("hallSubmissions", nextSubmissions);
  }
}

export async function readCollection(name) {
  await ensureStorage();
  return loadCollection(name);
}

export async function writeCollection(name, data) {
  await ensureStorage();
  replaceCollection(name, data);
}
