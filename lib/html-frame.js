export const HTML_FRAME_MESSAGE_TYPE = "mathzine:html-frame-resize";
export const HTML_FRAME_MIN_HEIGHT = 240;
export const HTML_FRAME_MAX_HEIGHT = 100_000;

export function clampHtmlFrameHeight(value, fallback = 720) {
  const numericValue = Number(value);
  const numericFallback = Number(fallback);
  const height = Number.isFinite(numericValue)
    ? numericValue
    : Number.isFinite(numericFallback)
      ? numericFallback
      : 720;

  return Math.min(HTML_FRAME_MAX_HEIGHT, Math.max(HTML_FRAME_MIN_HEIGHT, Math.ceil(height)));
}

function removeViewportMeta(html) {
  return html.replace(/<meta\b[^>]*>/gi, (tag) => {
    const isViewport = /\bname\s*=\s*(?:["']viewport["']|viewport(?:\s|>|\/))/i.test(tag);
    return isViewport ? "" : tag;
  });
}

function escapeForInlineScript(value) {
  return JSON.stringify(String(value)).replace(/</g, "\\u003c");
}

export function buildHtmlFrameSrcDoc(html, frameId) {
  const source = removeViewportMeta(String(html ?? ""));
  const safeFrameId = escapeForInlineScript(frameId);
  const headMarkup = `<meta name="viewport" content="width=device-width, initial-scale=1">
<style data-mathzine-frame-compat>
  *, *::before, *::after { box-sizing: border-box; }
  html, body {
    width: 100%;
    max-width: 100%;
    min-width: 0;
    height: auto !important;
    min-height: 0 !important;
    overflow-x: hidden !important;
    overflow-y: visible !important;
    touch-action: pan-x pan-y pinch-zoom;
  }
  html { background: transparent !important; }
  body { margin: 0 !important; }
  img, video, canvas, svg { max-width: 100% !important; height: auto; }
  iframe { max-width: 100% !important; }
  pre, code { max-width: 100%; white-space: pre-wrap; overflow-wrap: anywhere; }
  table { display: block; width: 100%; max-width: 100%; overflow-x: auto; }
</style>
<script data-mathzine-frame-resize>
  (() => {
    const frameId = ${safeFrameId};
    const messageType = ${escapeForInlineScript(HTML_FRAME_MESSAGE_TYPE)};
    let animationFrame = 0;

    const measure = () => {
      animationFrame = 0;
      const root = document.documentElement;
      const body = document.body;
      const height = Math.ceil(Math.max(
        root?.scrollHeight || 0,
        root?.offsetHeight || 0,
        root?.getBoundingClientRect().height || 0,
        body?.scrollHeight || 0,
        body?.offsetHeight || 0,
        body?.getBoundingClientRect().height || 0
      ));

      parent.postMessage({ type: messageType, frameId, height }, "*");
    };

    const scheduleMeasure = () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(measure);
    };

    const observe = () => {
      scheduleMeasure();
      const root = document.documentElement;
      const body = document.body;
      const mutationObserver = new MutationObserver(scheduleMeasure);
      mutationObserver.observe(root, { childList: true, subtree: true, attributes: true, characterData: true });

      if (typeof ResizeObserver === "function") {
        const resizeObserver = new ResizeObserver(scheduleMeasure);
        resizeObserver.observe(root);
        if (body) resizeObserver.observe(body);
      }

      if (document.fonts?.ready) document.fonts.ready.then(scheduleMeasure, scheduleMeasure);
      document.addEventListener("load", scheduleMeasure, true);
      document.addEventListener("error", scheduleMeasure, true);
      window.addEventListener("resize", scheduleMeasure);
      setTimeout(scheduleMeasure, 100);
      setTimeout(scheduleMeasure, 500);
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", observe, { once: true });
    } else {
      observe();
    }
  })();
</script>`;

  if (/<head\b[^>]*>/i.test(source)) {
    return source.replace(/<head\b[^>]*>/i, (head) => `${head}\n${headMarkup}`);
  }

  const head = `<head>\n${headMarkup}\n</head>`;
  if (/<html\b[^>]*>/i.test(source)) {
    return source.replace(/<html\b[^>]*>/i, (htmlTag) => `${htmlTag}\n${head}`);
  }

  if (/<!doctype\b[^>]*>/i.test(source)) {
    return source.replace(/<!doctype\b[^>]*>/i, (doctype) => `${doctype}\n${head}`);
  }

  return `${head}\n${source}`;
}
