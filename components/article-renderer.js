import {
  calloutVariantOptions,
  collectReferencedEntries,
  getDocumentPullQuote,
  getReferenceNumberMap,
  normalizeArticleDocument
} from "@/lib/article-blocks";

function renderInlineContent(text, prefix = "inline") {
  const source = String(text ?? "");
  const pattern = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|(https?:\/\/[^\s]+)|\*\*([^*]+)\*\*|__([^_]+)__|~~([^~]+)~~|`([^`]+)`|\*([^*]+)\*/g;
  const nodes = [];
  let lastIndex = 0;
  let index = 0;

  function splitTrailingPunctuation(url) {
    const match = String(url).match(/^(.*?)([),.;!?]+)?$/);
    return {
      href: match?.[1] ?? url,
      trailing: match?.[2] ?? ""
    };
  }

  for (const match of source.matchAll(pattern)) {
    if (match.index > lastIndex) {
      nodes.push(<span key={`${prefix}-text-${index}`}>{source.slice(lastIndex, match.index)}</span>);
      index += 1;
    }

    if (match[1] && match[2]) {
      nodes.push(
        <a href={match[2]} key={`${prefix}-link-${index}`} rel="noreferrer" target="_blank">
          {renderInlineContent(match[1], `${prefix}-label-${index}`)}
        </a>
      );
    } else if (match[3]) {
      const { href, trailing } = splitTrailingPunctuation(match[3]);
      nodes.push(
        <a href={href} key={`${prefix}-raw-${index}`} rel="noreferrer" target="_blank">
          {href}
        </a>
      );
      if (trailing) {
        nodes.push(<span key={`${prefix}-raw-trailing-${index}`}>{trailing}</span>);
      }
    } else if (match[4]) {
      nodes.push(<strong key={`${prefix}-bold-${index}`}>{renderInlineContent(match[4], `${prefix}-bold-inner-${index}`)}</strong>);
    } else if (match[5]) {
      nodes.push(<span className="inline-underline" key={`${prefix}-underline-${index}`}>{renderInlineContent(match[5], `${prefix}-underline-inner-${index}`)}</span>);
    } else if (match[6]) {
      nodes.push(<del key={`${prefix}-del-${index}`}>{renderInlineContent(match[6], `${prefix}-del-inner-${index}`)}</del>);
    } else if (match[7]) {
      nodes.push(<code className="inline-code" key={`${prefix}-code-${index}`}>{match[7]}</code>);
    } else if (match[8]) {
      nodes.push(<em key={`${prefix}-italic-${index}`}>{renderInlineContent(match[8], `${prefix}-italic-inner-${index}`)}</em>);
    }

    lastIndex = match.index + match[0].length;
    index += 1;
  }

  if (lastIndex < source.length) {
    nodes.push(<span key={`${prefix}-tail-${index}`}>{source.slice(lastIndex)}</span>);
  }

  return nodes.length ? nodes : [<span key={`${prefix}-plain`}>{source}</span>];
}

function renderParagraphs(text, blockId) {
  return text.split("\n").map((paragraph, index) => (
    <p key={`${blockId}-${index}`}>{renderInlineContent(paragraph)}</p>
  ));
}

function ReferenceMarkers({ numberMap, referenceIds }) {
  if (!referenceIds?.length) {
    return null;
  }

  const numbers = referenceIds.map((referenceId) => numberMap.get(referenceId)).filter(Boolean);

  if (!numbers.length) {
    return null;
  }

  return (
    <sup className="article-reference-markers">
      {numbers.map((number) => (
        <a href={`#reference-${number}`} key={number}>
          [{number}]
        </a>
      ))}
    </sup>
  );
}

function MathFormula({ block }) {
  const fields = block.fields ?? {};

  switch (block.template) {
    case "fraction":
      return (
        <span className="math-frac">
          <span>{fields.numerator || " "}</span>
          <span>{fields.denominator || " "}</span>
        </span>
      );
    case "power":
      return (
        <span>
          {fields.base || "x"}
          <sup>{fields.exponent || "2"}</sup>
        </span>
      );
    case "root":
      return (
        <span className="math-root">
          {fields.degree && fields.degree !== "2" ? <sup>{fields.degree}</sup> : null}
          <span className="math-root-symbol">√</span>
          <span className="math-root-body">{fields.radicand || "x"}</span>
        </span>
      );
    case "sum":
      return (
        <span className="math-stack">
          <span className="math-stack-upper">{fields.upper || "n"}</span>
          <span className="math-stack-symbol">∑</span>
          <span className="math-stack-lower">{fields.lower || "i=1"}</span>
          <span className="math-stack-expression">{fields.expression || "a_i"}</span>
        </span>
      );
    case "integral":
      return (
        <span className="math-stack">
          <span className="math-stack-upper">{fields.upper || "1"}</span>
          <span className="math-stack-symbol">∫</span>
          <span className="math-stack-lower">{fields.lower || "0"}</span>
          <span className="math-stack-expression">
            {fields.integrand || "f(x)"} d{fields.variable || "x"}
          </span>
        </span>
      );
    case "custom":
      return <span>{fields.expression || ""}</span>;
    default:
      return (
        <span>
          {fields.left || "f(x)"} {fields.relation || "="} {fields.right || "x^2"}
        </span>
      );
  }
}

function BlockRenderer({ block, numberMap }) {
  const markers = <ReferenceMarkers numberMap={numberMap} referenceIds={block.referenceIds} />;

  switch (block.type) {
    case "heading": {
      const Tag = block.level === "h3" ? "h3" : "h2";
      return (
        <Tag className={`article-block article-heading ${block.level}`}>
          {renderInlineContent(block.text)}
          {markers}
        </Tag>
      );
    }
    case "callout": {
      const label = calloutVariantOptions.find((option) => option.value === block.variant)?.label ?? "잠깐 상식";
      return (
        <aside className={`article-block article-callout variant-${block.variant}`}>
          <p className="article-callout-label">{label}</p>
          {block.title ? <h3>{renderInlineContent(block.title)}</h3> : null}
          {renderParagraphs(block.body, block.id)}
          {markers}
        </aside>
      );
    }
    case "theorem":
      return (
        <section className="article-block article-proof-box theorem">
          <p className="article-proof-label">Theorem</p>
          <h3>{renderInlineContent(block.title)}</h3>
          {renderParagraphs(block.statement, block.id)}
          {markers}
        </section>
      );
    case "proof":
      return (
        <section className="article-block article-proof-box proof">
          <p className="article-proof-label">Proof</p>
          <h3>{renderInlineContent(block.title)}</h3>
          {renderParagraphs(block.body, block.id)}
          {markers}
        </section>
      );
    case "equation":
      return (
        <figure className="article-block article-equation">
          <div className="article-equation-formula">
            <MathFormula block={block} />
          </div>
          {block.caption ? <figcaption>{renderInlineContent(block.caption)}</figcaption> : null}
          {markers}
        </figure>
      );
    case "code":
      return (
        <section className="article-block article-code-block">
          <div className="article-code-header">
            <span>Code</span>
            <span>{block.language}</span>
          </div>
          <pre>
            <code>{block.code}</code>
          </pre>
          {markers}
        </section>
      );
    case "image":
      return (
        <figure className="article-block article-media-block">
          <img alt={block.alt || "기사 이미지"} className="article-media" src={block.src} />
          {block.caption || block.credit ? (
            <figcaption>
              {block.caption ? renderInlineContent(block.caption) : null}
              {block.credit ? <span className="media-credit"> · {block.credit}</span> : null}
            </figcaption>
          ) : null}
          {markers}
        </figure>
      );
    case "video":
      return (
        <figure className="article-block article-media-block">
          <video className="article-media" controls poster={block.poster || undefined} src={block.src} />
          {block.caption ? <figcaption>{renderInlineContent(block.caption)}</figcaption> : null}
          {markers}
        </figure>
      );
    case "link":
      return (
        <section className="article-block article-link-card">
          <p className="article-callout-label">Linked Resource</p>
          <h3>
            <a href={block.url} rel="noreferrer" target="_blank">
              {block.title}
            </a>
          </h3>
          {block.note ? <p>{renderInlineContent(block.note)}</p> : null}
          <p className="link-url">{block.url}</p>
          {markers}
        </section>
      );
    default:
      return (
        <p className={`article-block article-paragraph style-${block.style ?? "body"}`}>
          {renderInlineContent(block.text)}
          {markers}
        </p>
      );
  }
}

export function ArticleRenderer({ article, className = "", document }) {
  const normalized = normalizeArticleDocument(document ? { document } : article);
  const numberMap = getReferenceNumberMap(normalized);
  const references = collectReferencedEntries(normalized);

  return (
    <div className={`article-renderer ${className}`.trim()}>
      {normalized.blocks.map((block) => (
        <BlockRenderer block={block} key={block.id} numberMap={numberMap} />
      ))}

      {references.length ? (
        <section className="article-references">
          <div className="section-heading">
            <p className="eyebrow">References</p>
            <span>{references.length} items</span>
          </div>
          <ol className="plain-list">
            {references.map((reference) => (
              <li id={`reference-${reference.number}`} key={reference.id}>
                <strong>[{reference.number}]</strong> {reference.authors ? `${reference.authors}. ` : null}
                {reference.title}
                {reference.source ? `, ${reference.source}` : null}
                {reference.url ? (
                  <>
                    {" "}
                    <a href={reference.url} rel="noreferrer" target="_blank">
                      원문 보기
                    </a>
                  </>
                ) : null}
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}

export const buildArticlePullQuote = getDocumentPullQuote;
