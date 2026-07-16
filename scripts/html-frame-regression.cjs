const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);
  assert.ok(fs.existsSync(absolutePath), `${relativePath} should exist`);
  return fs.readFileSync(absolutePath, "utf8");
}

function loadHtmlFrameHelper() {
  const source = read("lib/html-frame.js");
  const exportNames = [...source.matchAll(/^export (?:const|function) (\w+)/gm)].map((match) => match[1]);
  const executable = `${source.replace(/^export /gm, "")}\nmodule.exports = { ${exportNames.join(", ")} };`;
  const sandbox = { module: { exports: {} } };
  vm.runInNewContext(executable, sandbox, { filename: "lib/html-frame.js" });
  return sandbox.module.exports;
}

function main() {
  const helper = loadHtmlFrameHelper();
  const restrictiveHtml = `<!doctype html>
    <html>
      <head><meta content="width=device-width, maximum-scale=1, user-scalable=no" name="viewport"></head>
      <body><main><img src="cover.png"><pre>long code</pre><table><tr><td>wide</td></tr></table></main></body>
    </html>`;
  const framedHtml = helper.buildHtmlFrameSrcDoc(restrictiveHtml, "frame-test");

  assert.match(framedHtml, /name="viewport" content="width=device-width, initial-scale=1"/);
  assert.doesNotMatch(framedHtml, /user-scalable\s*=\s*no/i);
  assert.doesNotMatch(framedHtml, /maximum-scale\s*=\s*1/i);
  assert.match(framedHtml, /touch-action:\s*pan-x pan-y pinch-zoom/);
  assert.match(framedHtml, /html\s*\{[^}]*overflow-x:\s*hidden !important/s);
  assert.match(framedHtml, /body\s*\{[^}]*overflow-x:\s*visible !important/s);
  assert.match(framedHtml, /img, video, canvas, svg \{ max-width: 100% !important/);
  assert.match(framedHtml, /pre, code \{ max-width: 100%; white-space: pre-wrap/);
  assert.match(framedHtml, /table \{ display: block; width: 100%; max-width: 100%; overflow-x: auto/);
  assert.match(framedHtml, /MutationObserver/);
  assert.match(framedHtml, /ResizeObserver/);
  assert.match(framedHtml, /document\.fonts\.ready/);
  assert.match(framedHtml, /parent\.postMessage/);
  assert.match(framedHtml, /mathzine:html-frame-resize/);
  assert.match(framedHtml, /data-mathzine-frame-fit/);
  assert.match(framedHtml, /scrollWidth/);
  assert.match(framedHtml, /style\.setProperty\("zoom"/);
  assert.match(framedHtml, /style\.setProperty\("translate"/);
  assert.match(framedHtml, /createTreeWalker/);
  assert.match(framedHtml, /getClientRects/);
  assert.match(framedHtml, /calculateHtmlFrameContentHeight/);
  assert.equal(helper.calculateHtmlFrameScale(1_200, 900), 0.75);
  assert.equal(helper.calculateHtmlFrameScale(840, 900), 1);
  assert.equal(helper.calculateHtmlFrameContentHeight(258.046875, 258), 259);
  assert.equal(helper.calculateHtmlFrameContentHeight(266.25, 258), 283);
  assert.equal(helper.calculateHtmlFrameContentHeight(240, 240), 240);
  assert.equal(helper.clampHtmlFrameHeight(10), 240);
  assert.equal(helper.clampHtmlFrameHeight(1_000_000), 100_000);

  const frameSource = read("components/html-document-frame.js");
  assert.match(frameSource, /^"use client";/);
  assert.match(frameSource, /event\.source !== iframeRef\.current\?\.contentWindow/);
  assert.match(frameSource, /scrolling="no"/);
  assert.match(frameSource, /sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-presentation"/);
  assert.doesNotMatch(frameSource, /allow-same-origin/);
  assert.match(frameSource, /aria-label="HTML 기사 본문"/);

  const rendererSource = read("components/article-renderer.js");
  assert.match(rendererSource, /<HtmlDocumentFrame html=\{document\.html\} initialHeight=\{document\.htmlHeight\} \/>/);
  assert.doesNotMatch(rendererSource, /style=\{\{ height: `\$\{document\.htmlHeight\}px` \}\}/);

  const articlePageSource = read("app/articles/[slug]/page.js");
  assert.doesNotMatch(articlePageSource, /Proof note|article-pullquote|article\.pullQuote/);

  const cssSource = read("app/globals.css");
  assert.doesNotMatch(cssSource, /\.article-pullquote/);
  assert.match(cssSource, /\.article-html-frame\s*\{[^}]*border:\s*0;/s);

  console.log("html frame regression: ok");
}

try {
  main();
} catch (error) {
  console.error(`html frame regression: ${error.message}`);
  process.exitCode = 1;
}
