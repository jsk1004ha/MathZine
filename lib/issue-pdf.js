import { existsSync } from "node:fs";
import { chromium } from "playwright-core";
import { renderIssuePrintHtml } from "@/lib/issue-print";

const EDGE_PATHS = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"
];
const ALLOWED_PDF_REQUEST_PROTOCOLS = new Set(["about:", "blob:", "data:"]);

function resolveBrowserExecutable() {
  return EDGE_PATHS.find((entry) => existsSync(entry));
}

export function isPdfRequestAllowed(requestUrl) {
  const value = String(requestUrl ?? "");

  try {
    const parsed = new URL(value);

    if (ALLOWED_PDF_REQUEST_PROTOCOLS.has(parsed.protocol)) {
      return true;
    }

    if (parsed.protocol === "file:" && parsed.pathname.includes("/_next/static/")) {
      return true;
    }
  } catch {}

  return false;
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

    await page.route("**/*", async (route) => {
      if (isPdfRequestAllowed(route.request().url())) {
        await route.continue();
        return;
      }

      await route.abort("blockedbyclient");
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
      const waitForFrames = Array.from(document.querySelectorAll("iframe")).map((frame) => {
        let loaded = false;

        try {
          loaded = frame.contentDocument?.readyState === "complete";
        } catch {}

        if (loaded) {
          return Promise.resolve();
        }

        return new Promise((resolve) => {
          let done = false;
          const finish = () => {
            if (done) {
              return;
            }

            done = true;
            resolve();
          };

          frame.addEventListener("load", finish, { once: true });
          frame.addEventListener("error", finish, { once: true });
          setTimeout(finish, 3000);
        });
      });

      await Promise.all([...waitForImages, ...waitForFrames]);
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
