export function sanitizeText(value, options = {}) {
  const { maxLength = 160, multiline = false } = options;
  let nextValue = String(value ?? "").replace(/\r/g, "").trim();

  if (!multiline) {
    nextValue = nextValue.replace(/\s+/g, " ");
  } else {
    nextValue = nextValue
      .split("\n")
      .map((line) => line.trim())
      .join("\n")
      .replace(/\n{3,}/g, "\n\n");
  }

  return nextValue.slice(0, maxLength);
}

export function slugify(value) {
  return sanitizeText(value, { maxLength: 80 })
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function splitParagraphs(value) {
  return sanitizeText(value, { maxLength: 8000, multiline: true })
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export function sanitizeUrl(value, options = {}) {
  const { allowRelative = false, maxLength = 500 } = options;
  const nextValue = sanitizeText(value, { maxLength });

  if (!nextValue) {
    return "";
  }

  if (allowRelative && nextValue.startsWith("/")) {
    return nextValue;
  }

  try {
    const parsed = new URL(nextValue);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.toString() : "";
  } catch {
    return "";
  }
}

export function assertSameOrigin(request) {
  const host = request.headers.get("host");
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  if (origin) {
    if (new URL(origin).host !== host) {
      throw new Error("Cross-site request blocked.");
    }

    return;
  }

  if (referer && new URL(referer).host === host) {
    return;
  }

  throw new Error("Origin could not be verified.");
}

export function withErrorCode(error, code, status = 400) {
  error.code = error.code || code;
  error.status = error.status || status;
  return error;
}
