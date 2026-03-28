import { readCollection } from "@/lib/store";
import { jsonError, jsonSuccess, noStoreHeaders } from "@/lib/api";

export async function GET() {
  try {
    const [users, articles, issues, auditLogs] = await Promise.all([
      readCollection("users"),
      readCollection("articles"),
      readCollection("issues"),
      readCollection("auditLogs")
    ]);

    return jsonSuccess(
      {
        status: "ok",
        uptimeSeconds: Math.floor(process.uptime()),
        counts: {
          users: users.length,
          articles: articles.length,
          issues: issues.length,
          auditLogs: auditLogs.length
        }
      },
      { headers: noStoreHeaders() }
    );
  } catch (error) {
    return jsonError(error, { code: "HEALTHCHECK_FAILED", status: 500 });
  }
}
