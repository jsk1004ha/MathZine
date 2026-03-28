import { AdminEditorialPanel } from "@/components/admin-panels";
import { listEditorialArticles, listEditorialIssues } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function AdminEditorialPage() {
  const [issues, articles] = await Promise.all([listEditorialIssues(), listEditorialArticles()]);

  return <AdminEditorialPanel articles={articles.filter((article) => article.status !== "published")} issues={issues} />;
}
