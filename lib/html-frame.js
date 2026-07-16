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

export function calculateHtmlFrameScale(contentWidth, viewportWidth) {
  const content = Number(contentWidth);
  const viewport = Number(viewportWidth);

  if (!Number.isFinite(content) || !Number.isFinite(viewport) || content <= 0 || viewport <= 0) {
    return 1;
  }

  return Math.min(1, Math.max(0.01, viewport / content));
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
    overflow-y: visible !important;
    touch-action: pan-x pan-y pinch-zoom;
  }
  html { background: transparent !important; overflow-x: hidden !important; }
  body { margin: 0 !important; overflow-x: visible !important; }
  img, video, canvas, svg { max-width: 100% !important; height: auto; }
  iframe { max-width: 100% !important; }
  pre, code { max-width: 100%; white-space: pre-wrap; overflow-wrap: anywhere; }
  table { display: block; width: 100%; max-width: 100%; overflow-x: auto; }
</style>
<script data-mathzine-frame-resize>
  (() => {
    const frameId = ${safeFrameId};
    const messageType = ${escapeForInlineScript(HTML_FRAME_MESSAGE_TYPE)};
    const calculateScale = ${calculateHtmlFrameScale.toString()};
    let animationFrame = 0;
    let shouldRefit = true;
    let appliedScale = 1;
    let originalBodyFit = null;

    const isInsideHorizontalScroller = (element, body) => {
      let ancestor = element.parentElement;

      while (ancestor && ancestor !== body) {
        const overflowX = getComputedStyle(ancestor).overflowX;
        if ((overflowX === "auto" || overflowX === "scroll") && ancestor.scrollWidth > ancestor.clientWidth + 1) {
          return true;
        }
        ancestor = ancestor.parentElement;
      }

      return false;
    };

    const restoreOriginalBodyFit = (body) => {
      if (!originalBodyFit) return;

      for (const property of ["zoom", "translate", "width"]) {
        const entry = originalBodyFit[property];
        if (entry.value) {
          body.style.setProperty(property, entry.value, entry.priority);
        } else {
          body.style.removeProperty(property);
        }
      }

      if (originalBodyFit.hadFitAttribute) {
        body.setAttribute("data-mathzine-frame-fit", "");
      } else {
        body.removeAttribute("data-mathzine-frame-fit");
      }
    };

    const fitToViewport = () => {
      const root = document.documentElement;
      const body = document.body;
      const viewportWidth = root?.clientWidth || window.innerWidth || 0;

      if (!root || !body || !viewportWidth) return;

      restoreOriginalBodyFit(body);
      const baseScale = Number.parseFloat(getComputedStyle(body).zoom) || 1;

      let minLeft = 0;
      let maxRight = viewportWidth;
      const elements = [body, ...body.querySelectorAll("*")];

      for (const element of elements) {
        if (element !== body && isInsideHorizontalScroller(element, body)) continue;

        const style = getComputedStyle(element);
        if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) continue;

        const rect = element.getBoundingClientRect();
        if (!rect.width || !rect.height) continue;
        if ((style.position === "absolute" || style.position === "fixed") && (rect.right <= 0 || rect.left >= viewportWidth)) continue;

        minLeft = Math.min(minLeft, rect.left);
        maxRight = Math.max(maxRight, rect.right);
      }

      const contentWidth = Math.max(1, maxRight - minLeft);
      const fitScale = calculateScale(contentWidth, viewportWidth);
      const offsetX = fitScale < 1 ? -minLeft / baseScale : 0;
      appliedScale = baseScale * fitScale;

      if (fitScale < 0.9999 || offsetX > 0.1) {
        body.style.setProperty("width", String(viewportWidth / baseScale) + "px", "important");
        body.style.setProperty("zoom", String(appliedScale), "important");
        body.style.setProperty("translate", String(offsetX) + "px 0", "important");
        body.setAttribute("data-mathzine-frame-fit", "");
      }
    };

    const measure = () => {
      animationFrame = 0;
      if (shouldRefit) {
        shouldRefit = false;
        fitToViewport();
      }
      const root = document.documentElement;
      const body = document.body;
      const bodyRect = body?.getBoundingClientRect();
      const height = Math.ceil(Math.max(
        root?.scrollHeight || 0,
        root?.offsetHeight || 0,
        root?.getBoundingClientRect().height || 0,
        (body?.scrollHeight || 0) * appliedScale,
        (body?.offsetHeight || 0) * appliedScale,
        bodyRect?.height || 0,
        bodyRect?.bottom || 0
      ));

      parent.postMessage({ type: messageType, frameId, height, scale: appliedScale }, "*");
    };

    const scheduleMeasure = (refit = false) => {
      shouldRefit ||= refit;
      if (animationFrame) cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(measure);
    };

    const observe = () => {
      const root = document.documentElement;
      const body = document.body;
      originalBodyFit = {
        zoom: { value: body?.style.getPropertyValue("zoom") || "", priority: body?.style.getPropertyPriority("zoom") || "" },
        translate: { value: body?.style.getPropertyValue("translate") || "", priority: body?.style.getPropertyPriority("translate") || "" },
        width: { value: body?.style.getPropertyValue("width") || "", priority: body?.style.getPropertyPriority("width") || "" },
        hadFitAttribute: Boolean(body?.hasAttribute("data-mathzine-frame-fit"))
      };
      scheduleMeasure(true);
      const mutationObserver = new MutationObserver((mutations) => {
        const onlyFrameFitChanges = mutations.every((mutation) =>
          mutation.type === "attributes" &&
          mutation.target === body &&
          (mutation.attributeName === "style" || mutation.attributeName === "data-mathzine-frame-fit")
        );
        scheduleMeasure(!onlyFrameFitChanges);
      });
      mutationObserver.observe(root, { childList: true, subtree: true, attributes: true, characterData: true });

      if (typeof ResizeObserver === "function") {
        const resizeObserver = new ResizeObserver(() => scheduleMeasure(false));
        resizeObserver.observe(root);
        if (body) resizeObserver.observe(body);
      }

      if (document.fonts?.ready) document.fonts.ready.then(() => scheduleMeasure(true), () => scheduleMeasure(true));
      document.addEventListener("load", () => scheduleMeasure(true), true);
      document.addEventListener("error", () => scheduleMeasure(true), true);
      window.addEventListener("resize", () => scheduleMeasure(true));
      setTimeout(() => scheduleMeasure(true), 100);
      setTimeout(() => scheduleMeasure(true), 500);
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
