import { sanitizeText, sanitizeUrl } from "@/lib/security";

export const paragraphStyleOptions = [
  { value: "body", label: "본문" },
  { value: "lead", label: "리드 문장" },
  { value: "latin", label: "라틴체" },
  { value: "note", label: "주석 톤" }
];

export const headingLevelOptions = [
  { value: "h2", label: "H2" },
  { value: "h3", label: "H3" }
];

export const calloutVariantOptions = [
  { value: "fact", label: "잠깐 상식" },
  { value: "mathematician", label: "수학자 소개" },
  { value: "hint", label: "증명 힌트" },
  { value: "editorial", label: "편집자 메모" }
];

export const equationTemplates = {
  equality: {
    label: "등식",
    defaults: { left: "f(x)", relation: "=", right: "x^2" },
    fields: [
      { name: "left", label: "왼쪽 식" },
      { name: "relation", label: "기호" },
      { name: "right", label: "오른쪽 식" }
    ]
  },
  fraction: {
    label: "분수",
    defaults: { numerator: "a+b", denominator: "n" },
    fields: [
      { name: "numerator", label: "분자" },
      { name: "denominator", label: "분모" }
    ]
  },
  power: {
    label: "지수",
    defaults: { base: "x", exponent: "2" },
    fields: [
      { name: "base", label: "밑" },
      { name: "exponent", label: "지수" }
    ]
  },
  root: {
    label: "제곱근",
    defaults: { degree: "2", radicand: "x+1" },
    fields: [
      { name: "degree", label: "차수" },
      { name: "radicand", label: "루트 안" }
    ]
  },
  sum: {
    label: "시그마",
    defaults: { lower: "i=1", upper: "n", expression: "a_i" },
    fields: [
      { name: "lower", label: "아래" },
      { name: "upper", label: "위" },
      { name: "expression", label: "본문 식" }
    ]
  },
  integral: {
    label: "적분",
    defaults: { lower: "0", upper: "1", integrand: "f(x)", variable: "x" },
    fields: [
      { name: "lower", label: "아래" },
      { name: "upper", label: "위" },
      { name: "integrand", label: "적분 함수" },
      { name: "variable", label: "변수" }
    ]
  },
  custom: {
    label: "직접 입력",
    defaults: { expression: "a_n = \\frac{1}{n}" },
    fields: [{ name: "expression", label: "표시 식" }]
  }
};

function createId(prefix) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createEmptyReference() {
  return {
    id: createId("ref"),
    title: "",
    authors: "",
    source: "",
    url: ""
  };
}

function createEmptyReferenceIds() {
  return [];
}

export function createEmptyBlock(type = "paragraph") {
  const shared = {
    id: createId("block"),
    referenceIds: createEmptyReferenceIds()
  };

  switch (type) {
    case "heading":
      return {
        ...shared,
        type,
        level: "h2",
        text: ""
      };
    case "callout":
      return {
        ...shared,
        type,
        variant: "fact",
        title: "",
        body: ""
      };
    case "theorem":
      return {
        ...shared,
        type,
        title: "정리",
        statement: ""
      };
    case "proof":
      return {
        ...shared,
        type,
        title: "증명",
        body: ""
      };
    case "equation":
      return {
        ...shared,
        type,
        template: "equality",
        fields: { ...equationTemplates.equality.defaults },
        caption: ""
      };
    case "code":
      return {
        ...shared,
        type,
        language: "python",
        code: ""
      };
    case "image":
      return {
        ...shared,
        type,
        src: "",
        alt: "",
        caption: "",
        credit: ""
      };
    case "video":
      return {
        ...shared,
        type,
        src: "",
        poster: "",
        caption: ""
      };
    case "link":
      return {
        ...shared,
        type,
        title: "",
        url: "",
        note: ""
      };
    default:
      return {
        ...shared,
        type: "paragraph",
        style: "body",
        text: ""
      };
  }
}

export function createEmptyArticleDocument() {
  return {
    blocks: [createEmptyBlock("paragraph"), createEmptyBlock("paragraph")],
    references: []
  };
}

function sanitizeReferenceIds(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.map((entry) => sanitizeText(entry, { maxLength: 80 })).filter(Boolean))];
}

function sanitizeReference(entry) {
  return {
    id: sanitizeText(entry?.id, { maxLength: 80 }) || createId("ref"),
    title: sanitizeText(entry?.title, { maxLength: 180 }),
    authors: sanitizeText(entry?.authors, { maxLength: 140 }),
    source: sanitizeText(entry?.source, { maxLength: 140 }),
    url: sanitizeUrl(entry?.url)
  };
}

function sanitizeEquationFields(template, fields) {
  const definition = equationTemplates[template] ?? equationTemplates.custom;
  const nextFields = {};

  for (const field of definition.fields) {
    nextFields[field.name] = sanitizeText(fields?.[field.name], { maxLength: 160, multiline: true });
  }

  return nextFields;
}

function sanitizeBlock(entry) {
  const type = sanitizeText(entry?.type, { maxLength: 20 }) || "paragraph";
  const id = sanitizeText(entry?.id, { maxLength: 80 }) || createId("block");
  const referenceIds = sanitizeReferenceIds(entry?.referenceIds);

  switch (type) {
    case "heading":
      return {
        id,
        type,
        level: entry?.level === "h3" ? "h3" : "h2",
        text: sanitizeText(entry?.text, { maxLength: 220, multiline: true }),
        referenceIds
      };
    case "callout":
      return {
        id,
        type,
        variant: calloutVariantOptions.some((option) => option.value === entry?.variant) ? entry.variant : "fact",
        title: sanitizeText(entry?.title, { maxLength: 120 }),
        body: sanitizeText(entry?.body, { maxLength: 1800, multiline: true }),
        referenceIds
      };
    case "theorem":
      return {
        id,
        type,
        title: sanitizeText(entry?.title, { maxLength: 120 }) || "정리",
        statement: sanitizeText(entry?.statement, { maxLength: 1800, multiline: true }),
        referenceIds
      };
    case "proof":
      return {
        id,
        type,
        title: sanitizeText(entry?.title, { maxLength: 120 }) || "증명",
        body: sanitizeText(entry?.body, { maxLength: 2400, multiline: true }),
        referenceIds
      };
    case "equation": {
      const template = equationTemplates[entry?.template] ? entry.template : "equality";
      return {
        id,
        type,
        template,
        fields: sanitizeEquationFields(template, entry?.fields),
        caption: sanitizeText(entry?.caption, { maxLength: 180 }),
        referenceIds
      };
    }
    case "code":
      return {
        id,
        type,
        language: sanitizeText(entry?.language, { maxLength: 40 }) || "python",
        code: sanitizeText(entry?.code, { maxLength: 3200, multiline: true }),
        referenceIds
      };
    case "image":
      return {
        id,
        type,
        src: sanitizeUrl(entry?.src, { allowRelative: true }),
        alt: sanitizeText(entry?.alt, { maxLength: 180 }),
        caption: sanitizeText(entry?.caption, { maxLength: 220 }),
        credit: sanitizeText(entry?.credit, { maxLength: 140 }),
        referenceIds
      };
    case "video":
      return {
        id,
        type,
        src: sanitizeUrl(entry?.src, { allowRelative: true }),
        poster: sanitizeUrl(entry?.poster, { allowRelative: true }),
        caption: sanitizeText(entry?.caption, { maxLength: 220 }),
        referenceIds
      };
    case "link":
      return {
        id,
        type,
        title: sanitizeText(entry?.title, { maxLength: 140 }),
        url: sanitizeUrl(entry?.url),
        note: sanitizeText(entry?.note, { maxLength: 400, multiline: true }),
        referenceIds
      };
    default:
      return {
        id,
        type: "paragraph",
        style: paragraphStyleOptions.some((option) => option.value === entry?.style) ? entry.style : "body",
        text: sanitizeText(entry?.text, { maxLength: 2200, multiline: true }),
        referenceIds
      };
  }
}

function blockHasContent(block) {
  switch (block.type) {
    case "heading":
    case "paragraph":
      return Boolean(block.text);
    case "callout":
      return Boolean(block.title || block.body);
    case "theorem":
      return Boolean(block.statement);
    case "proof":
      return Boolean(block.body);
    case "equation":
      return Object.values(block.fields ?? {}).some(Boolean);
    case "code":
      return Boolean(block.code);
    case "image":
      return Boolean(block.src);
    case "video":
      return Boolean(block.src);
    case "link":
      return Boolean(block.title && block.url);
    default:
      return false;
  }
}

export function sanitizeArticleDocument(document) {
  const blocks = Array.isArray(document?.blocks) ? document.blocks.map(sanitizeBlock).filter(blockHasContent).slice(0, 80) : [];
  const references = Array.isArray(document?.references)
    ? document.references.map(sanitizeReference).filter((reference) => reference.title || reference.source || reference.url).slice(0, 40)
    : [];

  return {
    blocks,
    references
  };
}

export function normalizeArticleDocument(article) {
  if (article?.blocks) {
    return {
      blocks: article.blocks,
      references: article.references ?? []
    };
  }

  if (article?.document?.blocks) {
    return {
      blocks: article.document.blocks,
      references: article.document.references ?? []
    };
  }

  return {
    blocks: (article?.content ?? []).map((paragraph, index) => ({
      id: `legacy_${index + 1}`,
      type: "paragraph",
      style: index === 0 ? "lead" : "body",
      text: paragraph,
      referenceIds: []
    })),
    references: []
  };
}

export function getEquationText(block) {
  const fields = block?.fields ?? {};

  switch (block?.template) {
    case "fraction":
      return `${fields.numerator || ""} / ${fields.denominator || ""}`.trim();
    case "power":
      return `${fields.base || ""}^${fields.exponent || ""}`.trim();
    case "root":
      return fields.degree && fields.degree !== "2" ? `${fields.degree}√(${fields.radicand || ""})` : `√(${fields.radicand || ""})`;
    case "sum":
      return `Σ(${fields.lower || ""}→${fields.upper || ""}) ${fields.expression || ""}`.trim();
    case "integral":
      return `∫[${fields.lower || ""}, ${fields.upper || ""}] ${fields.integrand || ""} d${fields.variable || ""}`.trim();
    case "custom":
      return fields.expression || "";
    default:
      return `${fields.left || ""} ${fields.relation || "="} ${fields.right || ""}`.trim();
  }
}

export function extractPlainTextFromDocument(document) {
  const normalized = normalizeArticleDocument({ document });
  const chunks = [];

  for (const block of normalized.blocks) {
    switch (block.type) {
      case "heading":
      case "paragraph":
        chunks.push(block.text);
        break;
      case "callout":
        chunks.push(block.title, block.body);
        break;
      case "theorem":
        chunks.push(block.title, block.statement);
        break;
      case "proof":
        chunks.push(block.title, block.body);
        break;
      case "equation":
        chunks.push(getEquationText(block), block.caption);
        break;
      case "code":
        chunks.push(block.language, block.code);
        break;
      case "image":
        chunks.push(block.alt, block.caption, block.credit);
        break;
      case "video":
        chunks.push(block.caption);
        break;
      case "link":
        chunks.push(block.title, block.note, block.url);
        break;
      default:
        break;
    }
  }

  for (const reference of normalized.references) {
    chunks.push(reference.title, reference.authors, reference.source);
  }

  return chunks.filter(Boolean).join(" ");
}

export function collectReferencedEntries(document) {
  const normalized = normalizeArticleDocument({ document });
  const referenceMap = new Map(normalized.references.map((reference) => [reference.id, reference]));
  const orderedIds = [];

  for (const block of normalized.blocks) {
    for (const referenceId of block.referenceIds ?? []) {
      if (referenceMap.has(referenceId) && !orderedIds.includes(referenceId)) {
        orderedIds.push(referenceId);
      }
    }
  }

  return orderedIds.map((referenceId, index) => ({
    ...referenceMap.get(referenceId),
    number: index + 1
  }));
}

export function getReferenceNumberMap(document) {
  return new Map(collectReferencedEntries(document).map((reference) => [reference.id, reference.number]));
}

export function getDocumentPullQuote(document) {
  const normalized = normalizeArticleDocument({ document });
  const candidate = normalized.blocks.find((block) =>
    ["paragraph", "theorem", "callout", "proof", "heading", "equation", "link"].includes(block.type)
  );

  if (!candidate) {
    return "";
  }

  switch (candidate.type) {
    case "heading":
    case "paragraph":
      return candidate.text;
    case "theorem":
      return candidate.statement;
    case "callout":
      return candidate.body || candidate.title;
    case "proof":
      return candidate.body;
    case "equation":
      return getEquationText(candidate);
    case "link":
      return candidate.title;
    default:
      return "";
  }
}

export function splitRichText(text) {
  const source = String(text ?? "");
  const pattern = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|(https?:\/\/[^\s]+)/g;
  const segments = [];
  let lastIndex = 0;

  for (const match of source.matchAll(pattern)) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", value: source.slice(lastIndex, match.index) });
    }

    const label = match[1] ?? match[3];
    const url = sanitizeUrl(match[2] ?? match[3]);

    if (url) {
      segments.push({ type: "link", value: label, url });
    } else {
      segments.push({ type: "text", value: match[0] });
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < source.length) {
    segments.push({ type: "text", value: source.slice(lastIndex) });
  }

  return segments.length ? segments : [{ type: "text", value: source }];
}
