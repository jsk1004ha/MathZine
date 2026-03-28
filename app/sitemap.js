import { listArticles, listIssues } from "@/lib/content";

export default async function sitemap() {
  const [articles, issues] = await Promise.all([listArticles(), listIssues()]);
  const now = new Date();

  return [
    {
      url: "/",
      lastModified: now
    },
    {
      url: "/issues",
      lastModified: now
    },
    {
      url: "/search",
      lastModified: now
    },
    ...articles.map((article) => ({
      url: `/articles/${article.slug}`,
      lastModified: article.publishedAt || article.updatedAt
    })),
    ...issues.map((issue) => ({
      url: `/issues/${issue.issueSlug}`,
      lastModified: issue.latestPublishedAt
    }))
  ];
}
