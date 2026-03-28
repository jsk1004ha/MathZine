"use client";

import { useEffect } from "react";

export function ViewTracker({ slug }) {
  useEffect(() => {
    const storageKey = `mathzine:view:${slug}`;

    if (window.sessionStorage.getItem(storageKey)) {
      return;
    }

    window.sessionStorage.setItem(storageKey, "1");

    fetch(`/api/articles/${slug}/view`, {
      method: "POST"
    }).catch(() => {});
  }, [slug]);

  return null;
}

