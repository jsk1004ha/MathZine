"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  buildHtmlFrameSrcDoc,
  clampHtmlFrameHeight,
  HTML_FRAME_MESSAGE_TYPE
} from "@/lib/html-frame";

export function HtmlDocumentFrame({ html, initialHeight }) {
  const iframeRef = useRef(null);
  const frameId = useId();
  const fallbackHeight = clampHtmlFrameHeight(initialHeight);
  const srcDoc = useMemo(() => buildHtmlFrameSrcDoc(html, frameId), [frameId, html]);
  const [measurement, setMeasurement] = useState(null);
  const height = measurement?.srcDoc === srcDoc ? measurement.height : fallbackHeight;

  useEffect(() => {
    function handleMessage(event) {
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (event.data?.type !== HTML_FRAME_MESSAGE_TYPE || event.data?.frameId !== frameId) return;

      const nextHeight = clampHtmlFrameHeight(event.data.height, fallbackHeight);
      setMeasurement((current) => {
        if (current?.srcDoc === srcDoc && current.height === nextHeight) return current;
        return { srcDoc, height: nextHeight };
      });
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [fallbackHeight, frameId, srcDoc]);

  return (
    <iframe
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
      allowFullScreen
      aria-label="HTML 기사 본문"
      className="article-block article-html-frame"
      ref={iframeRef}
      referrerPolicy="no-referrer"
      sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-presentation"
      scrolling="no"
      srcDoc={srcDoc}
      style={{ height: `${height}px` }}
      title="HTML 기사 본문"
    >
      HTML 기사 본문을 표시할 수 없습니다.
    </iframe>
  );
}
