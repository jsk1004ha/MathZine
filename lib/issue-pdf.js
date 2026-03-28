import { existsSync } from "node:fs";
import { chromium } from "playwright-core";
import { renderIssuePrintHtml } from "@/lib/issue-print";

const EDGE_PATHS = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"
];

function resolveBrowserExecutable() {
  return EDGE_PATHS.find((entry) => existsSync(entry));
}

export async function renderIssuePdf(bundle) {
  const executablePath = resolveBrowserExecutable();

  if (!executablePath) {
    throw new Error("시스템 Edge를 찾을 수 없습니다. PDF 렌더링을 위해 Microsoft Edge가 필요합니다.");
  }

  const html = await renderIssuePrintHtml(bundle);
  const browser = await chromium.launch({
    executablePath,
    headless: true
  });

  try {
    const page = await browser.newPage({
      viewport: { width: 1240, height: 1754 }
    });
    await page.setContent(html, { waitUntil: "networkidle" });
    await page.emulateMedia({ media: "print" });
    await page.evaluate(async () => {
      await document.fonts.ready;
      const waitForImages = Array.from(document.images).map((image) => {
        if (image.complete) {
          return Promise.resolve();
        }

        return new Promise((resolve) => {
          image.addEventListener("load", () => resolve(), { once: true });
          image.addEventListener("error", () => resolve(), { once: true });
        });
      });

      await Promise.all(waitForImages);
    });

    return await page.pdf({
      format: "A4",
      margin: {
        top: "0",
        right: "0",
        bottom: "0",
        left: "0"
      },
      printBackground: true,
      preferCSSPageSize: true
    });
  } finally {
    await browser.close();
  }
}
