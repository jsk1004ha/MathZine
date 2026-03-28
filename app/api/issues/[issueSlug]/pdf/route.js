import { NextResponse } from "next/server";
import { canManageAdmin, getUserFromRequest } from "@/lib/auth";
import { jsonError } from "@/lib/api";
import { getIssueBundle } from "@/lib/content";
import { renderIssuePdf } from "@/lib/issue-pdf";

export async function GET(request, { params }) {
  try {
    const { issueSlug } = await params;
    const user = await getUserFromRequest(request);

    let bundle = await getIssueBundle(issueSlug);

    if (!bundle && user) {
      const previewBundle = await getIssueBundle(issueSlug, { includeUnpublished: true, viewer: user });

      if (previewBundle && (previewBundle.status === "published" || canManageAdmin(user) || previewBundle.articles.some((article) => article.authorId === user.id))) {
        bundle = previewBundle;
      }
    }

    if (!bundle) {
      return jsonError(Object.assign(new Error("호수를 찾을 수 없습니다."), { status: 404, code: "ISSUE_NOT_FOUND" }));
    }

    const pdfBuffer = await renderIssuePdf(bundle);

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(`MathZine-${bundle.issue}.pdf`)}`,
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    return jsonError(error, { code: "ISSUE_PDF_FAILED" });
  }
}
