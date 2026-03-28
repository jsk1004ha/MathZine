import { AdminAccountsPanel } from "@/components/admin-panels";
import { listUsers } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminAccountsPage() {
  const users = await listUsers();
  return <AdminAccountsPanel users={users} />;
}
