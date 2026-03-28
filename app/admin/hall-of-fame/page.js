import { AdminHallPanel } from "@/components/admin-panels";
import { listEditorialArticles, listHallSubmissions } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function AdminHallPage() {
  const [articles, submissions] = await Promise.all([listEditorialArticles(), listHallSubmissions()]);

  return <AdminHallPanel articles={articles} submissions={submissions} />;
}
