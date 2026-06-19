function escapeHtmlAttribute(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("\"", "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function getImageAltText(fileName) {
  return String(fileName ?? "article-image")
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .trim() || "article image";
}

function decodeFileName(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function getImageSourceKey(value) {
  const withoutQuery = String(value ?? "").trim().split(/[?#]/)[0].replaceAll("\\", "/");
  const fileName = decodeFileName(withoutQuery.split("/").filter(Boolean).at(-1) ?? withoutQuery);

  return fileName.normalize("NFC").toLowerCase();
}

function shouldReportMissingSource(value) {
  const source = String(value ?? "").trim();

  return Boolean(source && !/^(?:[a-z][a-z0-9+.-]*:|\/api\/media\/|data:|#)/i.test(source));
}

export function buildHtmlImageSnippet(asset) {
  const src = escapeHtmlAttribute(asset?.url);
  const alt = escapeHtmlAttribute(asset?.alt || getImageAltText(asset?.name));

  return `<figure style="margin:24px 0"><img src="${src}" alt="${alt}" style="width:100%;height:auto;display:block" /></figure>`;
}

export function createHtmlImageAsset({ name, url }) {
  const alt = getImageAltText(name);

  return {
    name: String(name ?? "article-image"),
    url: String(url ?? ""),
    alt,
    tag: buildHtmlImageSnippet({ alt, name, url })
  };
}

export function replaceHtmlImageSources(html, assets) {
  const assetMap = new Map();

  for (const asset of assets ?? []) {
    const key = getImageSourceKey(asset?.name);

    if (key && asset?.url && !assetMap.has(key)) {
      assetMap.set(key, asset);
    }
  }

  const missingSources = [];
  let replacedCount = 0;
  const nextHtml = String(html ?? "").replace(
    /(<img\b[^>]*?\bsrc\s*=\s*)(["'])([^"']+)(\2)/gi,
    (match, prefix, quote, source, closingQuote) => {
      const asset = assetMap.get(getImageSourceKey(source));

      if (!asset) {
        if (shouldReportMissingSource(source) && !missingSources.includes(source)) {
          missingSources.push(source);
        }

        return match;
      }

      replacedCount += 1;
      return `${prefix}${quote}${escapeHtmlAttribute(asset.url)}${closingQuote}`;
    }
  );

  return {
    html: nextHtml,
    replacedCount,
    missingSources
  };
}
