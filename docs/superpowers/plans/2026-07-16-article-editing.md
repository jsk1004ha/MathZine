# Article Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let article authors and administrators edit existing articles through the current studio without breaking article URLs or engagement data.

**Architecture:** Add one shared article-edit permission predicate and one domain update function, expose the update through a slug-scoped PATCH route, then make the existing Studio page and form select create or edit mode from `?edit=`. Keep creation and editing on the same validation/rendering path.

**Tech Stack:** Next.js App Router, React client components, filesystem-backed collections, Node assertion regression scripts, Playwright smoke checks.

---

### Task 1: Lock Article Update Rules

**Files:**
- Modify: `scripts/content-regression.cjs`
- Modify: `lib/auth.js`
- Modify: `lib/content.js`

- [x] **Step 1: Write the failing regression**

Create an article, update it as its reporter, assert editable fields changed and immutable fields stayed equal. Assert another reporter is rejected and an admin may update it.

```js
const updated = await content.updateArticle(article.slug, updatePayload, reporter);
assert.equal(updated.title, "수정된 기사");
assert.equal(updated.slug, article.slug);
assert.equal(updated.views, article.views);
await assert.rejects(() => content.updateArticle(article.slug, updatePayload, stranger), /수정 권한/);
```

- [x] **Step 2: Run the focused regression and confirm RED**

Run: `npm run test:content`

Expected: FAIL because `content.updateArticle` is not defined.

- [x] **Step 3: Add the shared permission and domain update**

Add `canEditArticle(user, article)` in `lib/auth.js`: admin may edit all, reporter may edit only their own. Add `updateArticle(slug, payload, user)` in `lib/content.js`, using the same sanitization and document-derived fields as creation while preserving identity, publication, author, reaction, and relationship fields.

- [x] **Step 4: Run the focused regression and confirm GREEN**

Run: `npm run test:content`

Expected: PASS.

### Task 2: Expose the Authenticated Update API

**Files:**
- Create: `app/api/articles/[slug]/route.js`

- [x] **Step 1: Add PATCH handling**

Decode and sanitize the slug, authenticate, apply a moderate `articles.update` state-change limit, call `updateArticle`, write an `article.updated` audit event, and return the updated article through `jsonSuccess`.

- [x] **Step 2: Verify route syntax**

Run: `npm run typecheck`

Expected: PASS with the new App Router handler.

### Task 3: Reuse Studio for Editing

**Files:**
- Modify: `app/studio/page.js`
- Modify: `components/studio-form.js`

- [x] **Step 1: Resolve edit mode on the server**

Read `searchParams.edit`, load the unpublished article for the signed-in user, enforce `canEditArticle`, include the article's current issue in the select even when published, and pass `initialArticle` plus `editingSlug` to `StudioForm`.

- [x] **Step 2: Make form initialization mode-aware**

Initialize from `initialArticle`, namespace local drafts by slug, ignore the create draft while editing, render edit-specific labels, PATCH the slug endpoint, and redirect to the existing article URL after success.

- [x] **Step 3: Add studio list edit links**

Keep the article read link and add a clear `수정` entry pointing to `/studio?edit=<slug>`.

### Task 4: Add Article-Page Entry Point

**Files:**
- Modify: `app/articles/[slug]/page.js`
- Modify: `app/globals.css`

- [x] **Step 1: Show edit affordance only when authorized**

Use `canEditArticle` and render a compact `기사 수정` link in the article header actions without shifting the reading layout for other readers.

- [x] **Step 2: Verify design quality**

Run the visual-verdict workflow on desktop and mobile screenshots. Persist the verdict in `.omx/state/article-editing/ralph-progress.json`.

### Task 5: Full Verification

**Files:**
- Verify only

- [x] **Step 1: Run static and behavioral checks**

Run: `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build`.

Expected: all commands pass.

- [x] **Step 2: Exercise the browser flow**

Use a temporary authorized QA session, open an article, enter edit mode, and verify the existing fields and slug-scoped edit route. Exercise persistence in the isolated content regression so live article data is not mutated.

- [x] **Step 3: Inspect the final diff**

Confirm only the intended implementation, tests, and design documents changed; preserve the pre-existing untracked `lib/seed-data.js`.
