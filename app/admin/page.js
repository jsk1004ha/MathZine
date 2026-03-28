import { AdminDashboard } from "@/components/admin-panels";
import { listUsers } from "@/lib/auth";
import { listEditorialArticles, listEditorialIssues, listHallSubmissions } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [users, submissions, articles, issues] = await Promise.all([
    listUsers(),
    listHallSubmissions(),
    listEditorialArticles(),
    listEditorialIssues()
  ]);

  return (
    <AdminDashboard
      articleCount={articles.filter((article) => article.status !== "published").length}
      pendingIssueCount={issues.filter((issue) => issue.status !== "published").length}
      recentArticles={articles.filter((article) => article.status !== "published").slice(0, 3)}
      recentIssues={issues.filter((issue) => issue.status !== "published").slice(0, 3)}
      submissionCount={submissions.length}
      teacherCount={users.filter((user) => user.role === "teacher").length}
      userCount={users.length}
    />
  );
}
