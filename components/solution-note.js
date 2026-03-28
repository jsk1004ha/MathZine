"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

const CANVAS_WIDTH = 860;
const CANVAS_HEIGHT = 520;
const NOTE_GRID = 32;

function buildNotebookBackground(canvas) {
  const background = document.createElement("canvas");
  background.width = canvas.width;
  background.height = canvas.height;

  const context = background.getContext("2d");
  context.fillStyle = "#fffdfa";
  context.fillRect(0, 0, background.width, background.height);

  const gradient = context.createLinearGradient(0, 0, 0, background.height);
  gradient.addColorStop(0, "rgba(255,255,255,0.92)");
  gradient.addColorStop(1, "rgba(245,240,230,0.96)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, background.width, background.height);

  context.strokeStyle = "rgba(17, 17, 17, 0.05)";
  context.lineWidth = 1;

  for (let y = NOTE_GRID; y < background.height; y += NOTE_GRID) {
    context.beginPath();
    context.moveTo(0, y + 0.5);
    context.lineTo(background.width, y + 0.5);
    context.stroke();
  }

  for (let x = NOTE_GRID; x < background.width; x += NOTE_GRID) {
    context.beginPath();
    context.moveTo(x + 0.5, 0);
    context.lineTo(x + 0.5, background.height);
    context.stroke();
  }

  context.fillStyle = "rgba(139, 30, 21, 0.08)";
  context.fillRect(68, 0, 1, background.height);

  return background;
}

function getPoint(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY
  };
}

export const SolutionNote = forwardRef(function SolutionNote(_, ref) {
  const canvasRef = useRef(null);
  const backgroundRef = useRef(null);
  const drawingRef = useRef(false);
  const dirtyRef = useRef(false);
  const lastPointRef = useRef(null);
  const pointerIdRef = useRef(null);
  const [tool, setTool] = useState("pen");
  const [lineWidth, setLineWidth] = useState(3);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    backgroundRef.current = buildNotebookBackground(canvas);
    context.drawImage(backgroundRef.current, 0, 0);
    context.lineCap = "round";
    context.lineJoin = "round";
  }, []);

  function drawLine(from, to) {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    context.save();
    context.lineWidth = lineWidth;

    if (tool === "eraser") {
      const background = backgroundRef.current;
      const pattern = background ? context.createPattern(background, "no-repeat") || context.createPattern(background, "repeat") : null;

      context.globalCompositeOperation = "source-over";
      context.strokeStyle = pattern || "#fffdfa";
      context.lineWidth = Math.max(10, lineWidth * 4);
    } else {
      context.globalCompositeOperation = "source-over";
      context.strokeStyle = "#141414";
    }

    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.stroke();
    context.restore();
  }

  function drawPoint(point) {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    context.save();

    if (tool === "eraser") {
      const background = backgroundRef.current;
      const pattern = background ? context.createPattern(background, "no-repeat") || context.createPattern(background, "repeat") : null;

      context.fillStyle = pattern || "#fffdfa";
      context.beginPath();
      context.arc(point.x, point.y, Math.max(5, lineWidth * 2), 0, Math.PI * 2);
      context.fill();
    } else {
      context.fillStyle = "#141414";
      context.beginPath();
      context.arc(point.x, point.y, Math.max(1.5, lineWidth / 2), 0, Math.PI * 2);
      context.fill();
    }

    context.restore();
  }

  function beginStroke(event) {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    drawingRef.current = true;
    const startPoint = getPoint(event, canvas);
    lastPointRef.current = startPoint;
    pointerIdRef.current = event.pointerId ?? null;
    canvas.setPointerCapture?.(event.pointerId);
    drawPoint(startPoint);

    if (!dirtyRef.current && tool !== "eraser") {
      dirtyRef.current = true;
      setDirty(true);
    }
  }

  function continueStroke(event) {
    if (!drawingRef.current || !lastPointRef.current) {
      return;
    }

    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const nextPoint = getPoint(event, canvas);
    drawLine(lastPointRef.current, nextPoint);
    lastPointRef.current = nextPoint;

    if (!dirtyRef.current) {
      dirtyRef.current = true;
      setDirty(true);
    }
  }

  function endStroke() {
    const canvas = canvasRef.current;
    if (canvas) {
      try {
        if (pointerIdRef.current !== null) {
          canvas.releasePointerCapture?.(pointerIdRef.current);
        }
      } catch {}
    }
    drawingRef.current = false;
    lastPointRef.current = null;
    pointerIdRef.current = null;
  }

  function clear() {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (!backgroundRef.current) {
      backgroundRef.current = buildNotebookBackground(canvas);
    }
    context.drawImage(backgroundRef.current, 0, 0);
    dirtyRef.current = false;
    setDirty(false);
  }

  useImperativeHandle(ref, () => ({
    async exportFile() {
      const canvas = canvasRef.current;

      if (!canvas || !dirtyRef.current) {
        return null;
      }

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));

      if (!blob) {
        return null;
      }

      return new File([blob], `solution-note-${Date.now()}.png`, { type: "image/png" });
    },
    clear,
    hasInk() {
      return dirtyRef.current;
    }
  }));

  return (
    <section className="note-panel">
      <div className="section-heading">
        <p className="eyebrow">온라인 풀이 공간</p>
        <span>{dirty ? "작성 중인 노트가 있습니다" : "빈 노트"}</span>
      </div>
      <div className="note-toolbar">
        <button className={`ghost-button ${tool === "pen" ? "active" : ""}`} onClick={() => setTool("pen")} type="button">
          펜
        </button>
        <button className={`ghost-button ${tool === "eraser" ? "active" : ""}`} onClick={() => setTool("eraser")} type="button">
          지우개
        </button>
        <label className="note-slider">
          <span>굵기</span>
          <input max="10" min="1" onChange={(event) => setLineWidth(Number(event.target.value))} type="range" value={lineWidth} />
        </label>
        <button className="ghost-button" onClick={clear} type="button">
          전체 지우기
        </button>
      </div>
      <div className="note-canvas-shell">
        <canvas
          className="note-canvas"
          height={CANVAS_HEIGHT}
          onPointerCancel={endStroke}
          onPointerDown={beginStroke}
          onPointerLeave={endStroke}
          onPointerMove={continueStroke}
          onPointerUp={endStroke}
          ref={canvasRef}
          width={CANVAS_WIDTH}
        />
      </div>
      <p className="panel-note">파일을 올리지 않아도, 여기서 바로 풀이한 내용을 PNG 이미지로 저장해 제출할 수 있습니다.</p>
    </section>
  );
});
