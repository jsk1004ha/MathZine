import { readUploadedFile, sanitizeStoredFileName } from "@/lib/files";
import {
  calloutVariantOptions,
  collectReferencedEntries,
  normalizeArticleDocument
} from "@/lib/article-blocks";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function normalizeLineBreaks(value) {
  return String(value ?? "").replace(/\r\n?/g, "\n");
}

function splitTrailingPunctuation(url) {
  const match = String(url).match(/^(.*?)([),.;!?]+)?$/);
  return {
    href: match?.[1] ?? url,
    trailing: match?.[2] ?? ""
  };
}

function inlineToHtml(text) {
  const source = normalizeLineBreaks(text);
  const pattern = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|(https?:\/\/[^\s]+)|\*\*([^*]+)\*\*|__([^_]+)__|~~([^~]+)~~|`([^`]+)`|\*([^*]+)\*/g;
  let lastIndex = 0;
  let html = "";

  for (const match of source.matchAll(pattern)) {
    if (match.index > lastIndex) {
      html += escapeHtml(source.slice(lastIndex, match.index));
    }

    if (match[1] && match[2]) {
      html += `<a href="${escapeAttr(match[2])}" target="_blank" rel="noreferrer">${inlineToHtml(match[1])}</a>`;
    } else if (match[3]) {
      const { href, trailing } = splitTrailingPunctuation(match[3]);
      html += `<a href="${escapeAttr(href)}" target="_blank" rel="noreferrer">${escapeHtml(href)}</a>${escapeHtml(trailing)}`;
    } else if (match[4]) {
      html += `<strong>${inlineToHtml(match[4])}</strong>`;
    } else if (match[5]) {
      html += `<span class="print-underline">${inlineToHtml(match[5])}</span>`;
    } else if (match[6]) {
      html += `<del>${inlineToHtml(match[6])}</del>`;
    } else if (match[7]) {
      html += `<code>${escapeHtml(match[7])}</code>`;
    } else if (match[8]) {
      html += `<em>${inlineToHtml(match[8])}</em>`;
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < source.length) {
    html += escapeHtml(source.slice(lastIndex));
  }

  return html;
}

function paragraphsToHtml(text) {
  return normalizeLineBreaks(text)
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => `<p>${inlineToHtml(line)}</p>`)
    .join("");
}

function formatDate(dateString) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "numeric",
    day: "numeric"
  }).format(new Date(dateString));
}

function calloutLabel(variant) {
  return calloutVariantOptions.find((option) => option.value === variant)?.label ?? "잠깐 상식";
}

function renderEquationHtml(block) {
  const fields = block.fields ?? {};

  switch (block.template) {
    case "fraction":
      return `<span class="eq-frac"><span>${inlineToHtml(fields.numerator || " ")}</span><span>${inlineToHtml(fields.denominator || " ")}</span></span>`;
    case "power":
      return `<span>${inlineToHtml(fields.base || "x")}<sup>${inlineToHtml(fields.exponent || "2")}</sup></span>`;
    case "root":
      return `<span class="eq-root">${fields.degree && fields.degree !== "2" ? `<sup>${inlineToHtml(fields.degree)}</sup>` : ""}<span class="eq-root-symbol">√</span><span class="eq-root-body">${inlineToHtml(fields.radicand || "x")}</span></span>`;
    case "sum":
      return `<span class="eq-stack"><span class="eq-upper">${inlineToHtml(fields.upper || "n")}</span><span class="eq-symbol">∑</span><span class="eq-lower">${inlineToHtml(fields.lower || "i=1")}</span><span class="eq-expression">${inlineToHtml(fields.expression || "a_i")}</span></span>`;
    case "integral":
      return `<span class="eq-stack"><span class="eq-upper">${inlineToHtml(fields.upper || "1")}</span><span class="eq-symbol">∫</span><span class="eq-lower">${inlineToHtml(fields.lower || "0")}</span><span class="eq-expression">${inlineToHtml(fields.integrand || "f(x)")} d${inlineToHtml(fields.variable || "x")}</span></span>`;
    case "custom":
      return `<span>${inlineToHtml(fields.expression || "")}</span>`;
    default:
      return `<span>${inlineToHtml(fields.left || "f(x)")} ${inlineToHtml(fields.relation || "=")} ${inlineToHtml(fields.right || "x^2")}</span>`;
  }
}

async function mediaSourceToRenderableSrc(source) {
  const value = String(source ?? "").trim();

  if (!value) {
    return "";
  }

  if (value.startsWith("data:") || /^https?:\/\//i.test(value)) {
    return value;
  }

  if (!value.startsWith("/api/media/")) {
    return value;
  }

  const relative = sanitizeStoredFileName(decodeURIComponent(value.replace("/api/media/", "")));

  if (!relative) {
    return "";
  }

  const buffer = await readUploadedFile(relative);
  const extension = relative.split(".").pop()?.toLowerCase();
  const mimeType =
    extension === "png"
      ? "image/png"
      : extension === "jpg" || extension === "jpeg"
        ? "image/jpeg"
        : extension === "webp"
          ? "image/webp"
          : extension === "gif"
            ? "image/gif"
            : extension === "svg"
              ? "image/svg+xml"
              : "application/octet-stream";

  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

async function renderIssueCoverPage(bundle) {
  const coverSrc = await mediaSourceToRenderableSrc(bundle.coverImageSrc);

  if (coverSrc) {
    return `
      <section class="issue-cover-page issue-cover-page-image">
        <img alt="${escapeAttr(`${bundle.issue} 표지`)}" class="issue-cover-image" src="${escapeAttr(coverSrc)}" />
      </section>
    `;
  }

  return `
    <section class="issue-cover-page issue-cover-page-default">
      <div class="default-cover-center">
        <p class="print-logo default-cover-logo">Math-Zine</p>
        <p class="default-cover-issue">${escapeHtml(bundle.issue)}</p>
        <p class="default-cover-location">천수동</p>
      </div>
    </section>
  `;
}

function renderIssueTocPage(bundle) {
  return `
    <section class="issue-toc-page">
      <p class="print-logo">Math-Zine</p>
      <span class="cover-kicker">Contents</span>
      <div>
        <h1>${escapeHtml(bundle.issue)}</h1>
        <p class="issue-cover-footer">천수동의 수학 월간지 · ${bundle.articles.length} articles</p>
      </div>
      <div class="issue-cover-grid">
        ${bundle.articles.map((article, index) => `
          <div class="cover-index">${String(index + 1).padStart(2, "0")}</div>
          <div>
            <h3>${inlineToHtml(article.title)}</h3>
            <p>${inlineToHtml(article.deck)}</p>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

async function renderBlockHtml(block) {
  switch (block.type) {
    case "heading":
      return `<h${block.level === "h3" ? "3" : "2"} class="print-block print-heading ${escapeAttr(block.level)}">${inlineToHtml(block.text)}</h${block.level === "h3" ? "3" : "2"}>`;
    case "paragraph":
      return `<p class="print-block print-paragraph style-${escapeAttr(block.style || "body")}">${inlineToHtml(block.text)}</p>`;
    case "callout":
      return `<aside class="print-block print-callout variant-${escapeAttr(block.variant)}"><p class="print-label">${escapeHtml(calloutLabel(block.variant))}</p>${block.title ? `<h3>${inlineToHtml(block.title)}</h3>` : ""}${paragraphsToHtml(block.body)}</aside>`;
    case "theorem":
      return `<section class="print-block print-proof theorem"><p class="print-label">Theorem</p>${block.title ? `<h3>${inlineToHtml(block.title)}</h3>` : ""}${paragraphsToHtml(block.statement)}</section>`;
    case "proof":
      return `<section class="print-block print-proof proof"><p class="print-label">Proof</p>${block.title ? `<h3>${inlineToHtml(block.title)}</h3>` : ""}${paragraphsToHtml(block.body)}</section>`;
    case "equation":
      return `<figure class="print-block print-equation"><div class="print-equation-formula">${renderEquationHtml(block)}</div>${block.caption ? `<figcaption>${inlineToHtml(block.caption)}</figcaption>` : ""}</figure>`;
    case "code":
      return `<section class="print-block print-code"><div class="print-code-header"><span>Code</span><span>${escapeHtml(block.language || "")}</span></div><pre><code>${escapeHtml(normalizeLineBreaks(block.code))}</code></pre></section>`;
    case "image": {
      const src = await mediaSourceToRenderableSrc(block.src);
      const caption = [block.caption, block.credit].filter(Boolean).join(" · ");
      return `<figure class="print-block print-media">${src ? `<img alt="${escapeAttr(block.alt || "기사 이미지")}" src="${escapeAttr(src)}" />` : `<div class="print-media-missing">이미지를 불러오지 못했습니다.</div>`}${caption ? `<figcaption>${inlineToHtml(caption)}</figcaption>` : ""}</figure>`;
    }
    case "video":
      return `<figure class="print-block print-video"><div class="print-video-box">영상 / QR 링크는 웹 기사에서 확인</div>${block.caption ? `<figcaption>${inlineToHtml(block.caption)}</figcaption>` : ""}</figure>`;
    case "link":
      return `<section class="print-block print-link"><p class="print-label">Linked Resource</p><h3><a href="${escapeAttr(block.url)}" target="_blank" rel="noreferrer">${inlineToHtml(block.title || block.url)}</a></h3>${block.note ? paragraphsToHtml(block.note) : ""}<p class="print-link-url">${escapeHtml(block.url)}</p></section>`;
    default:
      return "";
  }
}

async function renderArticleSection(article) {
  const normalized = normalizeArticleDocument(article);
  const references = collectReferencedEntries(normalized);
  const blocks = [];

  for (const block of normalized.blocks) {
    blocks.push(await renderBlockHtml(block));
  }

  return `
    <section class="issue-article-page">
      <header class="issue-article-header">
        <div class="issue-topline">
          <p class="print-logo">Math-Zine</p>
          <p class="print-issue-name">${escapeHtml(article.issue)}</p>
          <span class="print-section-chip">${escapeHtml(article.section || "Feature")}</span>
        </div>
        <h1>${inlineToHtml(article.title)}</h1>
        <p class="issue-deck">${inlineToHtml(article.deck)}</p>
        <div class="issue-meta">${escapeHtml(article.authorNickname)} · ${escapeHtml(article.readTime)} · ${escapeHtml(formatDate(article.publishedAt || article.submittedAt))}</div>
      </header>
      <div class="issue-article-columns">
        ${blocks.join("")}
      </div>
      ${references.length ? `
        <section class="print-references">
          <h2>References</h2>
          <ol>
            ${references.map((reference) => `<li><strong>[${reference.number}]</strong> ${escapeHtml([reference.authors, reference.title, reference.source].filter(Boolean).join(". "))}${reference.url ? ` <a href="${escapeAttr(reference.url)}" target="_blank" rel="noreferrer">원문 보기</a>` : ""}</li>`).join("")}
          </ol>
        </section>
      ` : ""}
    </section>
  `;
}

export function getIssuePrintCss() {
  return `
    @page {
      size: A4;
      margin: 16mm 14mm 16mm;
    }

    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #f7f2e8; color: #111; }
    body { font-family: "Malgun Gothic", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif; line-height: 1.6; }
    img { max-width: 100%; display: block; }
    a { color: inherit; text-decoration: none; }
    .print-shell { width: 100%; }
    .print-logo { margin: 0; font-family: "Old English Text MT", "Lucida Blackletter", Georgia, serif; letter-spacing: 0.02em; }

    .issue-cover-page,
    .issue-toc-page,
    .issue-article-page,
    .issue-credits-page {
      break-after: page;
      background: #fffdfa;
    }

    .issue-cover-page,
    .issue-toc-page {
      min-height: calc(297mm - 32mm);
      padding: 20mm 18mm;
      display: flex;
      flex-direction: column;
      gap: 14mm;
      justify-content: flex-start;
    }

    .issue-cover-page {
      padding: 0;
      overflow: hidden;
    }

    .issue-cover-page-image {
      background: #111;
    }

    .issue-cover-image {
      width: 100%;
      height: calc(297mm - 32mm);
      object-fit: cover;
    }

    .issue-cover-page-default {
      align-items: center;
      justify-content: center;
      background:
        radial-gradient(circle at top right, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 32%),
        linear-gradient(135deg, #1a1a1a 0%, #2c2c2c 100%);
      color: #fff;
      text-align: center;
    }

    .default-cover-center {
      display: grid;
      gap: 14px;
      justify-items: center;
    }

    .default-cover-logo {
      font-size: 72px;
      line-height: 0.92;
    }

    .default-cover-issue {
      margin: 0;
      font-size: 32px;
      line-height: 1.14;
      font-weight: 800;
      word-break: keep-all;
    }

    .default-cover-location {
      margin: 0;
      font-size: 20px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    .issue-toc-page {
      border: 1px solid #151515;
    }

    .issue-toc-page .print-logo {
      font-size: 24px;
      border-bottom: 2px solid #111;
      padding-bottom: 10px;
    }

    .issue-toc-page h1 {
      margin: 0;
      font-size: 34px;
      line-height: 1.1;
    }

    .cover-kicker {
      display: inline-flex;
      align-self: flex-end;
      background: #9b231f;
      color: #fff;
      padding: 8px 14px;
      font-size: 13px;
      font-weight: 700;
    }

    .issue-cover-grid {
      display: grid;
      gap: 18px;
      grid-template-columns: 58px 1fr;
    }

    .issue-cover-grid .cover-index {
      color: #9b231f;
      font-size: 22px;
      font-weight: 700;
    }

    .issue-cover-grid h3 {
      margin: 0 0 6px;
      font-size: 20px;
      line-height: 1.2;
    }

    .issue-cover-grid p,
    .issue-cover-footer {
      margin: 0;
      color: #544d44;
      font-size: 12.5px;
    }

    .issue-article-page {
      padding-top: 2mm;
    }

    .issue-topline {
      display: flex;
      align-items: center;
      gap: 12px;
      border-bottom: 2px solid #111;
      padding-bottom: 8px;
      margin-bottom: 14px;
    }

    .issue-topline .print-logo {
      font-size: 22px;
      flex: 0 0 auto;
    }

    .print-issue-name {
      margin: 0;
      color: #6e665d;
      font-size: 12px;
      flex: 1 1 auto;
    }

    .print-section-chip {
      background: #9b231f;
      color: #fff;
      padding: 5px 10px;
      font-size: 11px;
      font-weight: 700;
      flex: 0 0 auto;
    }

    .issue-article-header h1 {
      margin: 0 0 10px;
      font-size: 38px;
      line-height: 1.12;
      font-weight: 800;
      word-break: keep-all;
    }

    .issue-deck {
      margin: 0 0 12px;
      padding-left: 12px;
      border-left: 4px solid #9b231f;
      color: #5b5349;
      font-size: 18px;
      line-height: 1.5;
    }

    .issue-meta {
      margin: 0 0 16px;
      color: #6e665d;
      font-size: 12px;
    }

    .issue-article-columns {
      column-count: 2;
      column-gap: 12mm;
      column-fill: auto;
    }

    .print-block {
      break-inside: avoid;
      -webkit-column-break-inside: avoid;
      page-break-inside: avoid;
      margin: 0 0 12px;
    }

    .print-heading.h2,
    .print-heading.h3,
    .print-references {
      column-span: all;
    }

    .print-heading.h2 {
      margin: 4px 0 10px;
      font-size: 22px;
      line-height: 1.2;
      font-weight: 800;
    }

    .print-heading.h3 {
      margin: 2px 0 8px;
      font-size: 17px;
      line-height: 1.25;
      font-weight: 700;
    }

    .print-paragraph {
      font-size: 14.5px;
      line-height: 1.85;
      text-align: justify;
      margin-bottom: 10px;
      word-break: keep-all;
    }

    .print-paragraph.style-lead {
      column-span: all;
      font-size: 18px;
      line-height: 1.7;
      margin-bottom: 14px;
      font-weight: 700;
    }

    .print-paragraph.style-latin {
      font-family: Georgia, "Times New Roman", serif;
      font-style: italic;
    }

    .print-paragraph.style-note {
      color: #645d55;
      font-size: 12.5px;
    }

    .print-callout,
    .print-proof,
    .print-equation,
    .print-link {
      border: 1px solid #d6cfc3;
      background: #fbf7ef;
      border-left: 5px solid #9b231f;
      border-radius: 8px;
      padding: 12px 14px;
    }

    .print-callout,
    .print-proof,
    .print-link {
      break-inside: auto;
      -webkit-column-break-inside: auto;
      page-break-inside: auto;
      overflow: visible;
      box-decoration-break: clone;
      -webkit-box-decoration-break: clone;
    }

    .print-proof.theorem { border-left-color: #334d64; }
    .print-proof.proof { border-left-color: #6c5748; }

    .print-label {
      margin: 0 0 6px;
      color: #6e665d;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .print-callout h3,
    .print-proof h3,
    .print-link h3,
    .print-references h2 {
      margin: 0 0 6px;
      font-size: 17px;
      line-height: 1.25;
    }

    .print-callout p,
    .print-proof p,
    .print-link p,
    .print-references li {
      margin: 0 0 8px;
      font-size: 13.6px;
      line-height: 1.75;
      word-break: keep-all;
      overflow-wrap: anywhere;
    }

    .print-equation {
      text-align: center;
    }

    .print-equation-formula {
      font-family: Georgia, "Times New Roman", serif;
      font-size: 23px;
      line-height: 1.4;
    }

    .print-equation figcaption {
      margin-top: 8px;
      color: #6e665d;
      font-size: 11px;
    }

    .eq-frac {
      display: inline-grid;
      grid-template-rows: auto auto;
      text-align: center;
      vertical-align: middle;
    }

    .eq-frac span:first-child {
      border-bottom: 1px solid currentColor;
      padding: 0 0.25em 0.1em;
    }

    .eq-frac span:last-child {
      padding-top: 0.1em;
    }

    .eq-root { display: inline-flex; align-items: flex-start; gap: 2px; }
    .eq-root-symbol { font-size: 1.2em; line-height: 1; }
    .eq-root-body { border-top: 1px solid currentColor; padding-top: 0.08em; }

    .eq-stack {
      display: inline-grid;
      grid-template-columns: auto auto;
      grid-template-areas:
        "upper expr"
        "symbol expr"
        "lower expr";
      align-items: center;
      column-gap: 8px;
    }

    .eq-upper { grid-area: upper; font-size: 0.65em; }
    .eq-symbol { grid-area: symbol; font-size: 1.35em; }
    .eq-lower { grid-area: lower; font-size: 0.65em; }
    .eq-expression { grid-area: expr; }

    .print-code {
      background: #171819;
      color: #f6efe4;
      border-radius: 8px;
      overflow: hidden;
    }

    .print-code-header {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      padding: 9px 12px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      background: #242729;
      color: #d8d0c3;
    }

    .print-code pre {
      margin: 0;
      padding: 12px;
      white-space: pre-wrap;
      word-break: break-word;
      font-family: "Cascadia Code", Consolas, monospace;
      font-size: 11.5px;
      line-height: 1.55;
      overflow-wrap: anywhere;
    }

    .print-media,
    .print-video {
      margin: 0 0 12px;
    }

    .print-media img,
    .print-media-missing,
    .print-video-box {
      width: 100%;
      border: 1px solid #d6cfc3;
      background: #f5efe5;
      border-radius: 8px;
    }

    .print-media img {
      object-fit: contain;
      max-height: 260px;
    }

    .print-media-missing,
    .print-video-box {
      min-height: 110px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 18px;
      color: #6e665d;
      font-size: 13px;
      text-align: center;
    }

    .print-media figcaption,
    .print-video figcaption,
    .print-link-url {
      margin-top: 6px;
      color: #6e665d;
      font-size: 11px;
      line-height: 1.55;
    }

    .print-underline {
      text-decoration: underline;
      text-underline-offset: 0.12em;
    }

    .print-references {
      margin-top: 12px;
      padding-top: 8px;
      border-top: 1px solid #d6cfc3;
    }

    .print-references ol {
      margin: 0;
      padding-left: 18px;
    }

    .issue-credits-page {
      min-height: calc(297mm - 32mm);
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .issue-credits-page .issue-topline {
      margin-bottom: 8px;
    }

    .contributors-list {
      display: grid;
      gap: 10px;
    }

    .contributors-list article {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 10px;
      padding-bottom: 10px;
      border-bottom: 1px solid #ded6c9;
    }

    .contributors-list h3 {
      margin: 0;
      font-size: 18px;
    }

    .contributors-list p {
      margin: 2px 0 0;
      color: #6e665d;
      font-size: 12px;
    }

    .colophon-card {
      border: 1px solid #d6cfc3;
      background: #f7f1e6;
      border-left: 5px solid #9b231f;
      border-radius: 12px;
      padding: 18px 22px;
    }

    .colophon-card h2 {
      margin: 0 0 10px;
      font-size: 18px;
    }

    .colophon-card p {
      margin: 0 0 10px;
      font-size: 15px;
      line-height: 1.7;
      word-break: keep-all;
      overflow-wrap: anywhere;
    }
  `;
}

export async function renderIssuePrintBodyHtml(bundle) {
  const articleSections = [];

  for (const article of bundle.articles) {
    articleSections.push(await renderArticleSection(article));
  }

  const contributors = [...new Set(bundle.articles.map((article) => article.authorNickname).filter(Boolean))];
  const coverPage = await renderIssueCoverPage(bundle);
  const tocPage = renderIssueTocPage(bundle);

  return `
    <div class="print-shell">
      ${coverPage}
      ${tocPage}
      ${articleSections.join("")}
      <section class="issue-credits-page">
        <div class="issue-topline">
          <p class="print-logo">Math-Zine</p>
          <p class="print-issue-name">${escapeHtml(bundle.issue)}</p>
          <span class="print-section-chip">Contributors</span>
        </div>
        <div>
          <h1 style="margin:0 0 8px;font-size:34px;line-height:1.1;">Contributors</h1>
          <p style="margin:0;color:#5b5349;font-size:14px;">이번 호에 참여한 필진과 편집 정보를 한 장에 정리했습니다.</p>
        </div>
        <div class="contributors-list">
          ${contributors.map((nickname) => `
            <article>
              <div>
                <h3>${escapeHtml(nickname)}</h3>
                <p>MathZine contributor</p>
              </div>
              <p style="margin:0;color:#8b1e15;font-weight:700;">필진</p>
            </article>
          `).join("")}
        </div>
        <div class="colophon-card">
          <h2>Colophon</h2>
          <p>발행호: ${escapeHtml(bundle.issue)}</p>
          <p>발행: 천재들의 수학 동아리</p>
          <p>브랜드: <span class="print-logo" style="font-size:1em;">Math-Zine</span></p>
          <p>라이선스: CC BY-NC-SA 3.0 KR</p>
          <p>본 PDF는 MathZine 지면 레이아웃을 기준으로 브라우저 렌더 후 저장되었습니다.</p>
        </div>
      </section>
    </div>
  `;
}

export async function renderIssuePrintHtml(bundle) {
  const body = await renderIssuePrintBodyHtml(bundle);

  return `
    <!doctype html>
    <html lang="ko">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(bundle.issue)} | MathZine Print</title>
        <style>${getIssuePrintCss()}</style>
      </head>
      <body>${body}</body>
    </html>
  `;
}
