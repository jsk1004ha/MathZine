import { redirect } from "next/navigation";
import { AdminHallPanel } from "@/components/admin-panels";
import { canManageAdmin, getCurrentUser } from "@/lib/auth";
import { listHallSubmissions } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function AdminHallPage() {
  const user = await getCurrentUser();

  if (!canManageAdmin(user)) {
    redirect("/admin/editorial");
  }

  const submissions = await listHallSubmissions();

  return <AdminHallPanel submissions={submissions} />;
}
