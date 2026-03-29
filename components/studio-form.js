"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { parseApiError } from "@/lib/api-client";
import { ArticleRenderer } from "@/components/article-renderer";
import { InlineRichTextField } from "@/components/inline-rich-text-field";
import {
  calloutVariantOptions,
  createEmptyArticleDocument,
  createEmptyBlock,
  createEmptyReference,
  equationTemplates,
  headingLevelOptions,
  paragraphStyleOptions
} from "@/lib/article-blocks";

const blockTypeOptions = [
  { value: "paragraph", label: "문단" },
  { value: "heading", label: "소제목" },
  { value: "callout", label: "콜아웃" },
  { value: "theorem", label: "정리" },
  { value: "proof", label: "증명" },
  { value: "equation", label: "수식" },
  { value: "code", label: "코드" },
  { value: "image", label: "사진" },
  { value: "video", label: "영상" },
  { value: "link", label: "링크" }
];
const STUDIO_DRAFT_KEY = "mathzine-studio-draft-v1";

function getInitialArticle() {
  return {
    title: "",
    deck: "",
    section: "Feature",
    tag: "Mathematics",
    issue: "",
    readTime: "5 min read",
    document: createEmptyArticleDocument()
  };
}

function hasMeaningfulDraft(article) {
  const document = article?.document ?? {};
  const blocks = Array.isArray(document.blocks) ? document.blocks : [];
  const references = Array.isArray(document.references) ? document.references : [];

  return Boolean(
    article?.title ||
      article?.deck ||
      article?.issue ||
      blocks.some((block) =>
        ["text", "body", "statement", "code", "src", "url", "caption", "title"].some((field) => String(block?.[field] ?? "").trim()) ||
        Object.values(block?.fields ?? {}).some((value) => String(value ?? "").trim())
      ) ||
      references.some((reference) => reference.title || reference.source || reference.url)
  );
}

function readStoredDraft() {
  try {
    const raw = window.localStorage.getItem(STUDIO_DRAFT_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);

    if (!parsed?.article) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function getSelectedValues(event) {
  return Array.from(event.target.selectedOptions, (option) => option.value);
}

function isFilled(value) {
  return String(value ?? "").trim().length > 0;
}

function getSubmissionIssues(article) {
  const issues = [];
  const blocks = article?.document?.blocks ?? [];

  if (!isFilled(article?.title)) {
    issues.push({ id: "title", targetId: "studio-field-title", message: "제목을 입력해 주세요." });
  }

  if (!isFilled(article?.deck)) {
    issues.push({ id: "deck", targetId: "studio-field-deck", message: "데크를 입력해 주세요." });
  }

  if (!isFilled(article?.issue)) {
    issues.push({ id: "issue", targetId: "studio-field-issue", message: "호수를 입력해 주세요." });
  }

  if (!isFilled(article?.readTime)) {
    issues.push({ id: "readTime", targetId: "studio-field-readTime", message: "읽기 시간을 입력해 주세요." });
  }

  if (!blocks.length) {
    issues.push({ id: "blocks-empty", targetId: "studio-block-toolbar", message: "본문 블록을 하나 이상 추가해 주세요." });
    return issues;
  }

  blocks.forEach((block, index) => {
    const targetId = `studio-block-${block.id}`;
    const label = `${index + 1}번 ${blockTypeOptions.find((option) => option.value === block.type)?.label ?? "블록"}`;

    if (block.type === "paragraph" && !isFilled(block.text)) {
      issues.push({ id: `${block.id}-text`, targetId, message: `${label} 내용이 비어 있습니다.` });
    }

    if (block.type === "heading" && !isFilled(block.text)) {
      issues.push({ id: `${block.id}-heading`, targetId, message: `${label} 제목을 입력해 주세요.` });
    }

    if (block.type === "callout" && !isFilled(block.body)) {
      issues.push({ id: `${block.id}-callout`, targetId, message: `${label} 설명을 입력해 주세요.` });
    }

    if (block.type === "theorem" && !isFilled(block.statement)) {
      issues.push({ id: `${block.id}-theorem`, targetId, message: `${label} 정리 내용을 입력해 주세요.` });
    }

    if (block.type === "proof" && !isFilled(block.body)) {
      issues.push({ id: `${block.id}-proof`, targetId, message: `${label} 증명 내용을 입력해 주세요.` });
    }

    if (block.type === "code" && !isFilled(block.code)) {
      issues.push({ id: `${block.id}-code`, targetId, message: `${label} 코드를 입력해 주세요.` });
    }

    if ((block.type === "image" || block.type === "video") && !isFilled(block.src)) {
      issues.push({ id: `${block.id}-media`, targetId, message: `${label} 파일 또는 URL을 넣어 주세요.` });
    }

    if (block.type === "link" && (!isFilled(block.title) || !isFilled(block.url))) {
      issues.push({ id: `${block.id}-link`, targetId, message: `${label} 제목과 URL을 모두 입력해 주세요.` });
    }
  });

  return issues;
}

function BlockReferenceSelector({ block, references, onChange }) {
  if (!references.length) {
    return <p className="inline-note">참고문헌을 추가하면 블록에 각주를 연결할 수 있습니다.</p>;
  }

  return (
    <label>
      <span>연결할 각주</span>
      <select multiple onChange={(event) => onChange(getSelectedValues(event))} value={block.referenceIds ?? []}>
        {references.map((reference, index) => (
          <option key={reference.id} value={reference.id}>
            [{index + 1}] {reference.title || reference.source || "제목 없는 참고문헌"}
          </option>
        ))}
      </select>
    </label>
  );
}

function MediaUploader({ accept, block, kind, onUpdate }) {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function uploadFile(file) {
    if (!file) {
      return;
    }

    setPending(true);
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("kind", kind);
      formData.append("file", file);

      const response = await fetch("/api/uploads/media", {
        method: "POST",
        body: formData
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(parseApiError(payload, "업로드에 실패했습니다."));
      }

      onUpdate("src", payload.data.url);
      setMessage("업로드가 완료되었습니다.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="media-upload-panel">
      <label>
        <span>{kind === "image" ? "이미지 업로드" : "영상 업로드"}</span>
        <input accept={accept} disabled={pending} onChange={(event) => uploadFile(event.target.files?.[0] ?? null)} type="file" />
      </label>
      <label>
        <span>{kind === "image" ? "이미지 URL" : "영상 URL"}</span>
        <input onChange={(event) => onUpdate("src", event.target.value)} value={block.src} />
      </label>
      {message ? <p className="inline-note">{message}</p> : null}
    </div>
  );
}

function BlockEditor({
  block,
  index,
  total,
  references,
  onDelete,
  onMoveDown,
  onMoveUp,
  onReferenceChange,
  onTypeChange,
  onUpdate
}) {
  return (
    <article className="block-editor" id={`studio-block-${block.id}`}>
      <div className="block-editor-header">
        <div>
          <p className="eyebrow">Block {String(index + 1).padStart(2, "0")}</p>
          <strong>{blockTypeOptions.find((option) => option.value === block.type)?.label ?? "문단"}</strong>
        </div>
        <div className="block-editor-actions">
          <button className="ghost-button" disabled={index === 0} onClick={onMoveUp} type="button">
            위로
          </button>
          <button className="ghost-button" disabled={index === total - 1} onClick={onMoveDown} type="button">
            아래로
          </button>
          <button className="ghost-button" onClick={onDelete} type="button">
            삭제
          </button>
        </div>
      </div>

      <label>
        <span>블록 종류</span>
        <select onChange={(event) => onTypeChange(event.target.value)} value={block.type}>
          {blockTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      {block.type === "paragraph" ? (
        <>
          <label>
            <span>문단 스타일</span>
            <select onChange={(event) => onUpdate("style", event.target.value)} value={block.style}>
              {paragraphStyleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <InlineRichTextField label="내용" onChange={(value) => onUpdate("text", value)} rows={6} value={block.text} />
          <p className="inline-note">URL을 그대로 붙여 넣으면 자동으로 링크로 인식합니다.</p>
        </>
      ) : null}

      {block.type === "heading" ? (
        <>
          <label>
            <span>헤딩 레벨</span>
            <select onChange={(event) => onUpdate("level", event.target.value)} value={block.level}>
              {headingLevelOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <InlineRichTextField label="제목" multiline={false} onChange={(value) => onUpdate("text", value)} value={block.text} />
        </>
      ) : null}

      {block.type === "callout" ? (
        <>
          <label>
            <span>콜아웃 템플릿</span>
            <select onChange={(event) => onUpdate("variant", event.target.value)} value={block.variant}>
              {calloutVariantOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <InlineRichTextField label="상자 제목" multiline={false} onChange={(value) => onUpdate("title", value)} value={block.title} />
          <InlineRichTextField label="설명" onChange={(value) => onUpdate("body", value)} rows={5} value={block.body} />
        </>
      ) : null}

      {block.type === "theorem" ? (
        <>
          <InlineRichTextField label="정리 제목" multiline={false} onChange={(value) => onUpdate("title", value)} value={block.title} />
          <InlineRichTextField label="정리 내용" onChange={(value) => onUpdate("statement", value)} rows={5} value={block.statement} />
        </>
      ) : null}

      {block.type === "proof" ? (
        <>
          <InlineRichTextField label="증명 제목" multiline={false} onChange={(value) => onUpdate("title", value)} value={block.title} />
          <InlineRichTextField label="증명 내용" onChange={(value) => onUpdate("body", value)} rows={6} value={block.body} />
        </>
      ) : null}

      {block.type === "equation" ? (
        <>
          <label>
            <span>수식 템플릿</span>
            <select
              onChange={(event) =>
                onUpdate("equationTemplate", event.target.value, { fields: { ...equationTemplates[event.target.value].defaults } })
              }
              value={block.template}
            >
              {Object.entries(equationTemplates).map(([value, definition]) => (
                <option key={value} value={value}>
                  {definition.label}
                </option>
              ))}
            </select>
          </label>
          <div className="block-grid">
            {equationTemplates[block.template].fields.map((field) => (
              <label key={`${block.id}-${field.name}`}>
                <span>{field.label}</span>
                <input
                  onChange={(event) => onUpdate("equationField", field.name, event.target.value)}
                  value={block.fields?.[field.name] ?? ""}
                />
              </label>
            ))}
          </div>
          <InlineRichTextField label="캡션" multiline={false} onChange={(value) => onUpdate("caption", value)} value={block.caption} />
        </>
      ) : null}

      {block.type === "code" ? (
        <>
          <label>
            <span>언어</span>
            <input onChange={(event) => onUpdate("language", event.target.value)} value={block.language} />
          </label>
          <label>
            <span>코드</span>
            <textarea onChange={(event) => onUpdate("code", event.target.value)} rows={8} value={block.code} />
          </label>
        </>
      ) : null}

      {block.type === "image" ? (
        <>
          <MediaUploader accept="image/*" block={block} kind="image" onUpdate={onUpdate} />
          <label>
            <span>대체 텍스트</span>
            <input onChange={(event) => onUpdate("alt", event.target.value)} value={block.alt} />
          </label>
          <InlineRichTextField label="캡션" multiline={false} onChange={(value) => onUpdate("caption", value)} value={block.caption} />
          <label>
            <span>출처/크레딧</span>
            <input onChange={(event) => onUpdate("credit", event.target.value)} value={block.credit} />
          </label>
        </>
      ) : null}

      {block.type === "video" ? (
        <>
          <MediaUploader accept="video/mp4,video/webm,video/ogg" block={block} kind="video" onUpdate={onUpdate} />
          <label>
            <span>포스터 이미지 URL</span>
            <input onChange={(event) => onUpdate("poster", event.target.value)} value={block.poster} />
          </label>
          <InlineRichTextField label="캡션" multiline={false} onChange={(value) => onUpdate("caption", value)} value={block.caption} />
        </>
      ) : null}

      {block.type === "link" ? (
        <>
          <InlineRichTextField label="링크 제목" multiline={false} onChange={(value) => onUpdate("title", value)} value={block.title} />
          <label>
            <span>URL</span>
            <input onChange={(event) => onUpdate("url", event.target.value)} value={block.url} />
          </label>
          <InlineRichTextField label="설명" onChange={(value) => onUpdate("note", value)} rows={4} value={block.note} />
        </>
      ) : null}

      <BlockReferenceSelector block={block} onChange={onReferenceChange} references={references} />
    </article>
  );
}

export function StudioForm() {
  const router = useRouter();
  const [article, setArticle] = useState(getInitialArticle);
  const [articleMessage, setArticleMessage] = useState("");
  const [articlePending, setArticlePending] = useState(false);
  const [draftMessage, setDraftMessage] = useState("");
  const [draftReady, setDraftReady] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [showValidationGuide, setShowValidationGuide] = useState(false);
  const isRestoringDraftRef = useRef(true);
  const submissionIssues = getSubmissionIssues(article);

  useEffect(() => {
    const storedDraft = readStoredDraft();

    if (storedDraft?.article) {
      setArticle(storedDraft.article);
      setLastSavedAt(storedDraft.savedAt || "");
      setDraftMessage(storedDraft.savedAt ? `임시저장본을 불러왔습니다. 마지막 저장 ${new Date(storedDraft.savedAt).toLocaleString("ko-KR")}` : "임시저장본을 불러왔습니다.");
    }

    isRestoringDraftRef.current = false;
    setDraftReady(true);
  }, []);

  useEffect(() => {
    if (!draftReady) {
      return undefined;
    }

    if (!hasMeaningfulDraft(article)) {
      window.localStorage.removeItem(STUDIO_DRAFT_KEY);
      setLastSavedAt("");
      setIsDirty(false);
      return undefined;
    }

    if (isRestoringDraftRef.current) {
      return undefined;
    }

    setIsDirty(true);
    const timer = window.setTimeout(() => {
      const savedAt = new Date().toISOString();
      window.localStorage.setItem(STUDIO_DRAFT_KEY, JSON.stringify({ savedAt, article }));
      setLastSavedAt(savedAt);
      setDraftMessage(`임시저장됨 · ${new Date(savedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}`);
      setIsDirty(false);
    }, 900);

    return () => window.clearTimeout(timer);
  }, [article, draftReady]);

  useEffect(() => {
    if (!isDirty) {
      return undefined;
    }

    function handleBeforeUnload(event) {
      event.preventDefault();
      event.returnValue = "";
    }

    function handleDocumentClick(event) {
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;

      if (!anchor) {
        return;
      }

      const href = anchor.getAttribute("href");

      if (!href || href.startsWith("#") || anchor.target === "_blank" || anchor.hasAttribute("download")) {
        return;
      }

      const destination = new URL(anchor.href, window.location.href);

      if (destination.origin !== window.location.origin) {
        return;
      }

      if (!window.confirm("임시저장 전인 변경 내용이 있습니다. 페이지를 떠날까요?")) {
        event.preventDefault();
        event.stopPropagation();
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleDocumentClick, true);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [isDirty]);

  useEffect(() => {
    if (!previewOpen) {
      return undefined;
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setPreviewOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewOpen]);

  function updateArticleField(field, value) {
    setArticle((prev) => ({ ...prev, [field]: value }));
  }

  function updateBlocks(updater) {
    setArticle((prev) => ({
      ...prev,
      document: {
        ...prev.document,
        blocks: updater(prev.document.blocks)
      }
    }));
  }

  function updateReferences(updater) {
    setArticle((prev) => ({
      ...prev,
      document: {
        ...prev.document,
        references: updater(prev.document.references)
      }
    }));
  }

  function updateBlock(blockId, field, value, options = {}) {
    updateBlocks((blocks) =>
      blocks.map((block) => {
        if (block.id !== blockId) {
          return block;
        }

        if (field === "equationTemplate") {
          return {
            ...createEmptyBlock("equation"),
            ...block,
            type: "equation",
            template: value,
            fields: options.fields ?? { ...equationTemplates[value].defaults }
          };
        }

        if (field === "equationField") {
          return {
            ...block,
            fields: {
              ...block.fields,
              [value]: options
            }
          };
        }

        return {
          ...block,
          [field]: value
        };
      })
    );
  }

  function addBlock(type) {
    updateBlocks((blocks) => [...blocks, createEmptyBlock(type)]);
  }

  function removeBlock(blockId) {
    updateBlocks((blocks) => (blocks.length === 1 ? blocks : blocks.filter((block) => block.id !== blockId)));
  }

  function moveBlock(blockId, direction) {
    updateBlocks((blocks) => {
      const index = blocks.findIndex((block) => block.id === blockId);

      if (index === -1) {
        return blocks;
      }

      const nextIndex = direction === "up" ? index - 1 : index + 1;

      if (nextIndex < 0 || nextIndex >= blocks.length) {
        return blocks;
      }

      const nextBlocks = [...blocks];
      [nextBlocks[index], nextBlocks[nextIndex]] = [nextBlocks[nextIndex], nextBlocks[index]];
      return nextBlocks;
    });
  }

  function changeBlockType(blockId, type) {
    updateBlocks((blocks) => blocks.map((block) => (block.id === blockId ? createEmptyBlock(type) : block)));
  }

  function addReference() {
    updateReferences((references) => [...references, createEmptyReference()]);
  }

  function updateReference(referenceId, field, value) {
    updateReferences((references) =>
      references.map((reference) => (reference.id === referenceId ? { ...reference, [field]: value } : reference))
    );
  }

  function removeReference(referenceId) {
    updateReferences((references) => references.filter((reference) => reference.id !== referenceId));
    updateBlocks((blocks) =>
      blocks.map((block) => ({
        ...block,
        referenceIds: (block.referenceIds ?? []).filter((entry) => entry !== referenceId)
      }))
    );
  }

  async function submitArticle(event) {
    event.preventDefault();
    setShowValidationGuide(true);
    setArticlePending(true);
    setArticleMessage("");

    if (submissionIssues.length) {
      setArticleMessage("부족한 항목을 먼저 채워 주세요.");
      setArticlePending(false);
      return;
    }

    try {
      const response = await fetch("/api/articles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(article)
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(parseApiError(payload, "기사 저장에 실패했습니다."));
      }

      window.localStorage.removeItem(STUDIO_DRAFT_KEY);
      setArticle(getInitialArticle());
      setLastSavedAt("");
      setDraftMessage("임시저장본을 비우고 새 원고 상태로 초기화했습니다.");
      setIsDirty(false);
      setArticleMessage("기사가 저장되었고, 현재는 편집부 검토 대기 상태입니다.");
      router.refresh();
    } catch (error) {
      setArticleMessage(error.message);
    } finally {
      setArticlePending(false);
    }
  }

  function clearDraft() {
    window.localStorage.removeItem(STUDIO_DRAFT_KEY);
    setArticle(getInitialArticle());
    setDraftMessage("임시저장본을 지웠습니다.");
    setLastSavedAt("");
    setIsDirty(false);
  }

  function scrollToTarget(targetId) {
    const target = document.getElementById(targetId);

    if (!target) {
      return;
    }

    target.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <>
      {previewOpen ? (
        <div className="preview-modal-backdrop" onClick={() => setPreviewOpen(false)} role="presentation">
          <div
            aria-label="기사 미리보기"
            className="preview-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="preview-modal-header">
              <div className="section-heading">
                <p className="eyebrow">Popup Preview</p>
                <span>{article.document.blocks.length} blocks</span>
              </div>
              <button className="ghost-button" onClick={() => setPreviewOpen(false)} type="button">
                닫기
              </button>
            </div>
            <div className="editor-preview-surface editorial-preview-surface preview-modal-surface">
              <ArticleRenderer className="preview-magazine" document={article.document} />
            </div>
          </div>
        </div>
      ) : null}

      <form className="studio-card" onSubmit={submitArticle}>
      <div className="studio-card-header">
        <span className="eyebrow">Article Desk</span>
        <h2>새 기사 제출</h2>
      </div>
      <p className="panel-note">제목, 데크, 호수를 먼저 정리한 뒤 블록을 쌓으면 지면 흐름이 훨씬 안정적으로 잡힙니다.</p>
      <div className="draft-status-row">
        <p className="inline-note">{draftMessage || (lastSavedAt ? `마지막 임시저장 ${new Date(lastSavedAt).toLocaleString("ko-KR")}` : "작성 내용은 브라우저에 임시저장됩니다.")}</p>
        <div className="draft-status-actions">
          <button className="ghost-button" onClick={() => setPreviewOpen(true)} type="button">
            팝업 미리보기
          </button>
          <button className="ghost-button" onClick={clearDraft} type="button">
            임시저장 비우기
          </button>
        </div>
      </div>

      <div id="studio-field-title">
        <InlineRichTextField label="제목" multiline={false} onChange={(value) => updateArticleField("title", value)} value={article.title} />
      </div>

      <div id="studio-field-deck">
        <InlineRichTextField label="데크" onChange={(value) => updateArticleField("deck", value)} rows={3} value={article.deck} />
      </div>

      <div className="studio-row">
        <label>
          <span>섹션</span>
          <input onChange={(event) => updateArticleField("section", event.target.value)} value={article.section} />
        </label>
        <label>
          <span>태그</span>
          <input onChange={(event) => updateArticleField("tag", event.target.value)} value={article.tag} />
        </label>
      </div>

      <div className="studio-row">
        <label id="studio-field-issue">
          <span>호수</span>
          <input onChange={(event) => updateArticleField("issue", event.target.value)} placeholder="예: 2026년 4월호" value={article.issue} />
        </label>
        <label id="studio-field-readTime">
          <span>읽기 시간</span>
          <input onChange={(event) => updateArticleField("readTime", event.target.value)} value={article.readTime} />
        </label>
      </div>

      <div className="section-heading">
        <p className="eyebrow">Editor Blocks</p>
        <span>문단 안 서식 툴바와 자동 링크 인식을 포함한 블록 편집기</span>
      </div>

      <div className="editor-workbench">
        <aside className="editor-block-sidebar" id="studio-block-toolbar">
          <div className="editor-sticky-panel">
            <div className="section-heading">
              <p className="eyebrow">Add Blocks</p>
              <span>스크롤 중에도 고정됩니다</span>
            </div>
            <div className="editor-sidebar-actions">
              {blockTypeOptions.map((option) => (
                <button className="ghost-button" key={option.value} onClick={() => addBlock(option.value)} type="button">
                  {option.label} 추가
                </button>
              ))}
            </div>
          </div>
        </aside>

        <div className="editor-block-list">
          {article.document.blocks.map((block, index) => (
            <BlockEditor
              block={block}
              index={index}
              key={block.id}
              onDelete={() => removeBlock(block.id)}
              onMoveDown={() => moveBlock(block.id, "down")}
              onMoveUp={() => moveBlock(block.id, "up")}
              onReferenceChange={(value) => updateBlock(block.id, "referenceIds", value)}
              onTypeChange={(value) => changeBlockType(block.id, value)}
              onUpdate={(field, value, extra) => {
                if (field === "equationField") {
                  updateBlock(block.id, field, value, extra);
                  return;
                }

                updateBlock(block.id, field, value, extra);
              }}
              references={article.document.references}
              total={article.document.blocks.length}
            />
          ))}
        </div>
      </div>

      <section className="editor-reference-panel">
        <div className="section-heading">
          <p className="eyebrow">References</p>
          <button className="ghost-button" onClick={addReference} type="button">
            참고문헌 추가
          </button>
        </div>

        {article.document.references.length ? (
          <div className="reference-list">
            {article.document.references.map((reference) => (
              <article className="reference-card" key={reference.id}>
                <div className="block-editor-header">
                  <strong>{reference.title || "제목 없는 참고문헌"}</strong>
                  <button className="ghost-button" onClick={() => removeReference(reference.id)} type="button">
                    삭제
                  </button>
                </div>
                <div className="block-grid">
                  <label>
                    <span>저자</span>
                    <input onChange={(event) => updateReference(reference.id, "authors", event.target.value)} value={reference.authors} />
                  </label>
                  <label>
                    <span>출처</span>
                    <input onChange={(event) => updateReference(reference.id, "source", event.target.value)} value={reference.source} />
                  </label>
                </div>
                <label>
                  <span>제목</span>
                  <input onChange={(event) => updateReference(reference.id, "title", event.target.value)} value={reference.title} />
                </label>
                <label>
                  <span>링크</span>
                  <input onChange={(event) => updateReference(reference.id, "url", event.target.value)} value={reference.url} />
                </label>
              </article>
            ))}
          </div>
        ) : (
          <p className="inline-note">아직 참고문헌이 없습니다. 블록에 각주를 달고 싶다면 하나 이상 추가하세요.</p>
        )}
      </section>

      {showValidationGuide && submissionIssues.length ? (
        <section className="validation-panel">
          <div className="section-heading">
            <p className="eyebrow">제출 전 확인</p>
            <span>부족한 항목을 눌러 바로 이동할 수 있습니다</span>
          </div>
          <ul className="validation-list">
            {submissionIssues.map((issue) => (
              <li key={issue.id}>
                <button className="validation-link" onClick={() => scrollToTarget(issue.targetId)} type="button">
                  {issue.message}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="form-submit-row">
        <button className="primary-button wide-button" disabled={articlePending} type="submit">
          {articlePending ? "제출 중..." : "편집부에 제출"}
        </button>
        {submissionIssues.length ? (
          <p className="error-note">
            현재 제출 전 확인 항목 {submissionIssues.length}개가 있습니다.
            <button className="text-link-button" onClick={() => setShowValidationGuide(true)} type="button">
              확인하기
            </button>
          </p>
        ) : null}
        {isDirty ? <p className="status-note">입력 중인 변경 사항을 저장 중입니다.</p> : null}
        {articleMessage ? <p className={articleMessage.includes("실패") || articleMessage.includes("부족") ? "error-note" : "status-note"}>{articleMessage}</p> : null}
      </div>
      </form>
    </>
  );
}
