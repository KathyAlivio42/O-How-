import { redirect } from "next/navigation";
import { createServerReadClient } from "@/lib/supabase/server";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createServerReadClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  const { data: admin } = await supabase
    .from("admins")
    .select("full_name, role, is_active")
    .eq("id", user.id)
    .single();

  if (!admin || !admin.is_active) {
    redirect("/admin/login");
  }

  return <AdminShell adminName={admin.full_name}>{children}</AdminShell>;
}
