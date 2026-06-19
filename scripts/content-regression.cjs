const assert = require("node:assert/strict");
const { mkdirSync, mkdtempSync, rmSync, readFileSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const path = require("node:path");
const vm = require("node:vm");

const repoRoot = process.cwd();
const tempRoot = mkdtempSync(path.join(tmpdir(), "mathzine-regression-"));
process.chdir(tempRoot);

const context = vm.createContext({
  Buffer,
  URL,
  clearTimeout,
  console,
  crypto: globalThis.crypto,
  process,
  setTimeout,
  TextDecoder,
  TextEncoder
});
const moduleCache = new Map();
const collections = {
  users: [],
  sessions: [],
  articles: [],
  comments: [],
  boardPosts: [],
  hallProblems: [],
  hallSubmissions: [],
  issues: [],
  auditLogs: [],
  rateLimits: []
};
const storeModule = createSyntheticModule("@/lib/store", {
  readCollection: async (name) => JSON.parse(JSON.stringify(collections[name] ?? [])),
  writeCollection: async (name, data) => { collections[name] = JSON.parse(JSON.stringify(data)); },
  uploadsDir: path.join(tempRoot, "uploads")
});

function createSyntheticModule(specifier, namespace) {
  const names = Object.keys(namespace);
  return new vm.SyntheticModule(
    names,
    function initializeSyntheticModule() {
      for (const name of names) {
        this.setExport(name, namespace[name]);
      }
    },
    { context, identifier: specifier }
  );
}

async function loadExternalModule(specifier) {
  if (specifier === "next/headers") {
    return createSyntheticModule(specifier, {
      cookies: async () => ({ get: () => undefined })
    });
  }

  const namespace = await import(specifier);
  return createSyntheticModule(specifier, namespace);
}

function resolveLocalSpecifier(specifier, referencingModule) {
  if (specifier.startsWith("@/")) {
    const withoutAlias = specifier.slice(2);
    return path.join(repoRoot, withoutAlias.endsWith(".js") ? withoutAlias : `${withoutAlias}.js`);
  }

  if (specifier.startsWith(".")) {
    const base = path.dirname(referencingModule.identifier);
    const resolved = path.resolve(base, specifier);
    return resolved.endsWith(".js") || resolved.endsWith(".mjs") ? resolved : `${resolved}.js`;
  }

  return null;
}

async function loadLocalModule(filePath) {
  const resolvedPath = path.resolve(filePath);

  if (moduleCache.has(resolvedPath)) {
    return moduleCache.get(resolvedPath);
  }

  const source = readFileSync(resolvedPath, "utf8");
  const module = new vm.SourceTextModule(source, { context, identifier: resolvedPath });
  moduleCache.set(resolvedPath, module);

  await module.link(async (specifier, referencingModule) => {
    if (specifier === "@/lib/store") {
      return storeModule;
    }

    const localPath = resolveLocalSpecifier(specifier, referencingModule);
    return localPath ? loadLocalModule(localPath) : loadExternalModule(specifier);
  });
  await module.evaluate();
  return module;
}

async function loadNamespace(relativePath) {
  const module = await loadLocalModule(path.join(repoRoot, relativePath));
  return module.namespace;
}

async function evaluateSyntheticModule(module) {
  if (module.status === "unlinked") {
    await module.link(() => {
      throw new Error("Synthetic test module has no imports.");
    });
  }

  if (module.status === "linked") {
    await module.evaluate();
  }
}

async function resetCollections(store) {
  for (const name of Object.keys(collections)) {
    await store.writeCollection(name, []);
  }
}

async function main() {
  await evaluateSyntheticModule(storeModule);
  const blocks = await loadNamespace("lib/article-blocks.js");
  const store = storeModule.namespace;
  const content = await loadNamespace("lib/content.js");
  const auth = await loadNamespace("lib/auth.js");
  const pdf = await loadNamespace("lib/issue-pdf.js");
  const print = await loadNamespace("lib/issue-print.js");
  const htmlMedia = await loadNamespace("lib/html-media-tags.js");

  await resetCollections(store);

  const htmlImageAsset = htmlMedia.createHtmlImageAsset({
    name: 'rank-spectrum "draft".png',
    url: "/api/media/media/rank-spectrum.png?size=wide&v=1"
  });
  assert.equal(htmlImageAsset.alt, 'rank spectrum "draft"');
  assert.match(htmlImageAsset.tag, /^<figure /);
  assert.match(htmlImageAsset.tag, /src="\/api\/media\/media\/rank-spectrum\.png\?size=wide&amp;v=1"/);
  assert.match(htmlImageAsset.tag, /alt="rank spectrum &quot;draft&quot;"/);

  const htmlDocument = blocks.sanitizeArticleDocument({ mode: "html", html: "<h1>Hello</h1><p>World</p>", htmlHeight: 99 });
  assert.equal(htmlDocument.mode, "html");
  assert.equal(htmlDocument.htmlHeight, 240);
  assert.equal(blocks.extractPlainTextFromDocument(htmlDocument), "Hello World");
  assert.throws(
    () => blocks.sanitizeArticleDocument({ mode: "html", html: "x".repeat(blocks.ARTICLE_HTML_MAX_LENGTH + 1) }),
    /80,000자 이하/
  );
  assert.equal(blocks.sanitizeArticleDocument({ mode: "html", html: "<p>x</p>", htmlHeight: 9999 }).htmlHeight, 2400);

  mkdirSync(path.join(tempRoot, "uploads", "media"), { recursive: true });
  writeFileSync(path.join(tempRoot, "uploads", "media", "html-image.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  const printHtmlWithInlineMedia = await print.renderIssuePrintHtml({
    issue: "테스트호",
    articles: [
      {
        title: "HTML 이미지 기사",
        deck: "데크",
        section: "Feature",
        issue: "테스트호",
        authorNickname: "기자",
        readTime: "1 min read",
        submittedAt: new Date().toISOString(),
        document: {
          mode: "html",
          html: '<article><img src="/api/media/media/html-image.png" alt="도형" /></article>',
          htmlHeight: 320
        }
      }
    ]
  });
  assert.match(printHtmlWithInlineMedia, /data:image\/png;base64/);
  assert.doesNotMatch(printHtmlWithInlineMedia, /\/api\/media\/media\/html-image\.png/);

  const issue = await content.createIssue({ issue: "2026년 5월호" });
  const reporter = { id: "user_reporter", role: "reporter", nickname: "기자" };
  const article = await content.createArticle(
    {
      title: "HTML 기사",
      deck: "데크",
      section: "Feature",
      tag: "Math",
      issueSlug: issue.issueSlug,
      readTime: "3 min read",
      document: { mode: "html", html: "<article><h1>본문</h1><p>내용</p></article>", htmlHeight: 320 }
    },
    reporter
  );
  assert.equal(article.issueSlug, issue.issueSlug);
  assert.equal(article.document.mode, "html");
  assert.equal((await store.readCollection("issues")).length, 1);
  await assert.rejects(
    () => content.createArticle({ title: "없는 호", deck: "데크", section: "F", tag: "T", issueSlug: "missing", readTime: "1", document: { mode: "html", html: "<p>x</p>" } }, reporter),
    /호수를 선택/
  );
  assert.equal((await store.readCollection("issues")).length, 1);

  await content.publishIssue(issue.issueSlug);
  await assert.rejects(
    () => content.createArticle({ title: "공개 호", deck: "데크", section: "F", tag: "T", issueSlug: issue.issueSlug, readTime: "1", document: { mode: "html", html: "<p>x</p>" } }, reporter),
    /이미 공개된 호수/
  );
  await content.unpublishIssue(issue.issueSlug);
  assert.equal((await store.readCollection("issues"))[0].status, "draft");
  assert.equal((await store.readCollection("articles"))[0].status, "submitted");
  assert.equal((await content.listIssues()).length, 0);
  assert.equal((await content.getIssueBundle(issue.issueSlug, { includeUnpublished: true, viewer: reporter }))?.articles.length, 1);
  assert.equal(await content.getIssueBundle(issue.issueSlug, { includeUnpublished: true, viewer: { id: "stranger", role: "reporter" } }), null);

  await store.writeCollection("comments", [{ id: "comment_1", articleSlug: article.slug, userId: "u", authorNickname: "u", body: "x" }]);
  await store.writeCollection("hallProblems", [{ id: "problem_1", articleSlug: article.slug, title: "p", prompt: "p", status: "open", createdAt: new Date().toISOString(), type: "essay", points: 10, authorId: reporter.id }]);
  await store.writeCollection("hallSubmissions", [{ id: "submission_1", problemId: "problem_1", userId: "u", nickname: "u" }]);
  const deleteResult = await content.deleteArticle(article.slug);
  assert.equal(deleteResult.removedCommentCount, 1);
  assert.equal(deleteResult.detachedProblemCount, 1);
  assert.equal((await store.readCollection("articles")).length, 0);
  assert.equal((await store.readCollection("hallProblems"))[0].articleSlug, null);
  assert.equal((await store.readCollection("hallSubmissions")).length, 1);

  await store.writeCollection("boardPosts", [{ id: "board_delete", title: "삭제", kind: "discussion" }]);
  await content.deleteBoardPost("board_delete");
  assert.equal((await store.readCollection("boardPosts")).length, 0);

  const issueForProblem = await content.createIssue({ issue: "2026년 6월호" });
  const problemArticle = await content.createArticle(
    {
      title: "문제 기사",
      deck: "데크",
      section: "Feature",
      tag: "Math",
      issueSlug: issueForProblem.issueSlug,
      readTime: "3 min read",
      document: { mode: "html", html: "<p>문제용 본문</p>", htmlHeight: 320 }
    },
    reporter
  );
  const choiceProblem = await content.createHallProblem(
    {
      articleSlug: problemArticle.slug,
      title: "객관식",
      prompt: "답을 고르세요.",
      type: "multiple_choice",
      choices: ["2", "4"],
      correctAnswer: "4",
      points: 7
    },
    reporter
  );
  await assert.rejects(
    () => content.createHallProblem({ articleSlug: problemArticle.slug, title: "타인 문제", prompt: "x" }, { id: "other_reporter", role: "reporter", nickname: "타인" }),
    /본인이 작성한 기사/
  );
  const autoSubmission = await content.createHallSubmission({ problemId: choiceProblem.id, selectedChoice: "4" }, { id: "solver", role: "member", nickname: "풀이자" });
  assert.equal(autoSubmission.status, "awarded");
  assert.equal(autoSubmission.awardedPoints, 7);

  const essayProblem = await content.createHallProblem(
    {
      articleSlug: problemArticle.slug,
      title: "서술형",
      prompt: "설명하세요.",
      type: "essay",
      points: 12,
      scoringGuide: "논리성"
    },
    reporter
  );
  const essaySubmission = await content.createHallSubmission({ problemId: essayProblem.id, answerText: "풀이" }, { id: "solver2", role: "member", nickname: "풀이자2" });
  await assert.rejects(
    () => content.scoreHallSubmission(essaySubmission.id, 12, "awarded", { id: "other_reporter", role: "reporter", nickname: "타인" }),
    /채점할 권한/
  );
  const scoredEssay = await content.scoreHallSubmission(essaySubmission.id, 12, "awarded", reporter);
  assert.equal(scoredEssay.awardedPoints, 12);

  await store.writeCollection("users", [
    { id: "user_admin", role: "admin", status: "active", nickname: "관리자", authProvider: "local", loginId: "admin" },
    { id: "user_target", role: "member", status: "active", nickname: "대상", authProvider: "local", loginId: "target" }
  ]);
  await store.writeCollection("sessions", [{ token: "session_target", userId: "user_target", expiresAt: new Date(Date.now() + 60_000).toISOString() }]);
  await auth.updateUserBanStatus("user_target", "banned", "test", "user_admin");
  assert.equal((await store.readCollection("sessions")).length, 0);

  await store.writeCollection("sessions", [{ token: "session_target_2", userId: "user_target", expiresAt: new Date(Date.now() + 60_000).toISOString() }]);
  await store.writeCollection("articles", [{ id: "article_a", slug: "a", authorId: "user_target", authorNickname: "대상", likeUserIds: ["user_target", "user_other"], views: 0, issueSlug: issue.issueSlug }]);
  await store.writeCollection("boardPosts", [{ id: "board_a", authorId: "user_target", authorNickname: "대상" }]);
  await store.writeCollection("comments", [{ id: "comment_a", userId: "user_target", authorNickname: "대상" }]);
  await store.writeCollection("hallSubmissions", [{ id: "submission_a", userId: "user_target", nickname: "대상" }]);
  await auth.deleteUserAccount("user_target", "user_admin");
  assert.equal((await store.readCollection("users")).some((user) => user.id === "user_target"), false);
  assert.equal((await store.readCollection("sessions")).length, 0);
  assert.equal((await store.readCollection("articles"))[0].authorId, null);
  assert.equal((await store.readCollection("articles"))[0].authorNickname, "탈퇴한 사용자");
  assert.deepEqual((await store.readCollection("articles"))[0].likeUserIds, ["user_other"]);
  assert.equal((await store.readCollection("comments"))[0].userId, null);

  assert.equal(auth.canManageEditorial({ role: "teacher" }), true);
  assert.equal(auth.canManageAdmin({ role: "teacher" }), false);
  assert.equal(pdf.isPdfRequestAllowed("data:image/png;base64,abc"), true);
  assert.equal(pdf.isPdfRequestAllowed("about:srcdoc"), true);
  assert.equal(pdf.isPdfRequestAllowed("blob:null/id"), true);
  assert.equal(pdf.isPdfRequestAllowed("https://example.com/x.png"), false);
  assert.equal(pdf.isPdfRequestAllowed("http://127.0.0.1/admin"), false);
  assert.equal(pdf.isPdfRequestAllowed("file:///etc/passwd"), false);
}

main()
  .then(() => {
    console.log("Content regression checks passed.");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    process.chdir(repoRoot);
    rmSync(tempRoot, { recursive: true, force: true });
  });
