"use client";

import { useRef } from "react";

const toolbarActions = [
  { label: "B", title: "굵게", before: "**", after: "**" },
  { label: "I", title: "기울임", before: "*", after: "*" },
  { label: "U", title: "밑줄", before: "__", after: "__" },
  { label: "S", title: "취소선", before: "~~", after: "~~" },
  { label: "“”", title: "인용부호", before: "“", after: "”" },
  { label: "</>", title: "코드", before: "`", after: "`" }
];

function insertFormatting(element, value, onChange, before, after = "") {
  const start = element.selectionStart ?? value.length;
  const end = element.selectionEnd ?? value.length;
  const selectedText = value.slice(start, end);
  const nextValue = `${value.slice(0, start)}${before}${selectedText}${after}${value.slice(end)}`;
  onChange(nextValue);

  requestAnimationFrame(() => {
    element.focus();
    const selectionStart = start + before.length;
    const selectionEnd = selectionStart + selectedText.length;
    element.setSelectionRange(selectionStart, selectionEnd);
  });
}

function stripFormatting(text) {
  return String(text ?? "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/~~([^~]+)~~/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, "$1");
}

export function InlineRichTextField({
  label,
  multiline = true,
  onChange,
  placeholder = "",
  rows = 4,
  value
}) {
  const inputRef = useRef(null);
  const FieldTag = multiline ? "textarea" : "input";

  function applyToolbar(action) {
    const element = inputRef.current;

    if (!element) {
      return;
    }

    insertFormatting(element, value, onChange, action.before, action.after);
  }

  function insertLink() {
    const element = inputRef.current;

    if (!element) {
      return;
    }

    const url = window.prompt("연결할 URL을 입력하세요.", "https://");

    if (!url) {
      return;
    }

    const start = element.selectionStart ?? value.length;
    const end = element.selectionEnd ?? value.length;
    const selectedText = value.slice(start, end);

    if (selectedText) {
      insertFormatting(element, value, onChange, "[", `](${url})`);
      return;
    }

    insertFormatting(element, value, onChange, `${url} `, "");
  }

  function clearFormatting() {
    const element = inputRef.current;

    if (!element) {
      return;
    }

    const start = element.selectionStart ?? 0;
    const end = element.selectionEnd ?? value.length;

    if (start === end) {
      onChange(stripFormatting(value));
      return;
    }

    const selectedText = value.slice(start, end);
    const nextValue = `${value.slice(0, start)}${stripFormatting(selectedText)}${value.slice(end)}`;
    onChange(nextValue);

    requestAnimationFrame(() => {
      element.focus();
      element.setSelectionRange(start, start + stripFormatting(selectedText).length);
    });
  }

  return (
    <label className="rich-text-field">
      {label ? <span>{label}</span> : null}
      <div className="inline-toolbar">
        {toolbarActions.map((action) => (
          <button className="ghost-button toolbar-button" key={action.title} onClick={() => applyToolbar(action)} title={action.title} type="button">
            {action.label}
          </button>
        ))}
        <button className="ghost-button toolbar-button" onClick={insertLink} title="링크 삽입" type="button">
          URL
        </button>
        <button className="ghost-button toolbar-button" onClick={clearFormatting} title="서식 제거" type="button">
          Tx
        </button>
      </div>
      <FieldTag
        {...(multiline ? { rows } : { type: "text" })}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        ref={inputRef}
        value={value}
      />
    </label>
  );
}
