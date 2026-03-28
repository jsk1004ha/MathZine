import { existsSync } from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import { extractPlainTextFromDocument } from "@/lib/article-blocks";

function resolveKoreanFontPath() {
  const windir = process.env.WINDIR || "C:\\Windows";
  const candidates = [
    path.join(windir, "Fonts", "malgun.ttf"),
    path.join(windir, "Fonts", "malgunbd.ttf")
  ];

  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

function writeWrappedParagraph(doc, text, options = {}) {
  const content = String(text ?? "").trim();

  if (!content) {
    return;
  }

  doc.fontSize(options.fontSize ?? 11).fillColor(options.color ?? "#111111").text(content, {
    width: options.width ?? 500,
    lineGap: options.lineGap ?? 4
  });
}

export async function renderIssuePdf(bundle) {
  return await new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 50
    });
    const chunks = [];
    const fontPath = resolveKoreanFontPath();

    if (fontPath) {
      doc.font(fontPath);
    }

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(24).fillColor("#111111").text(bundle.issue);
    doc.moveDown(0.4);
    doc.fontSize(11).fillColor("#666666").text(`MathZine · ${bundle.articles.length} articles`);
    doc.moveDown(1);

    for (const article of bundle.articles) {
      doc.fontSize(18).fillColor("#111111").text(article.title);
      doc.moveDown(0.2);
      writeWrappedParagraph(doc, `${article.section} · ${article.tag} · ${article.authorNickname} · ${article.readTime}`, {
        fontSize: 10,
        color: "#666666"
      });
      doc.moveDown(0.2);
      writeWrappedParagraph(doc, article.deck, {
        fontSize: 12
      });
      doc.moveDown(0.4);

      const plainText = article.document ? extractPlainTextFromDocument(article.document) : (article.content ?? []).join("\n\n");
      writeWrappedParagraph(doc, plainText, {
        fontSize: 11
      });
      doc.moveDown(1);

      if (doc.y > 680) {
        doc.addPage();
      }
    }

    doc.end();
  });
}
