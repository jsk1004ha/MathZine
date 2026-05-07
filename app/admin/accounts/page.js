import { redirect } from "next/navigation";
import { AdminAccountsPanel } from "@/components/admin-panels";
import { canManageAdmin, getCurrentUser, listUsers } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminAccountsPage() {
  const user = await getCurrentUser();

  if (!canManageAdmin(user)) {
    redirect("/admin/editorial");
  }

  const users = await listUsers();
  return <AdminAccountsPanel currentUserId={user.id} users={users} />;
}
