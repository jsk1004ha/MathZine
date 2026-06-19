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
