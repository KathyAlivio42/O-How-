import { createRouteHandlerClient } from "@/lib/supabase/server";

export async function requireAdmin(requireFullAdmin = false) {
  const supabase = createRouteHandlerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not signed in." as const, status: 401 as const };

  const { data: admin } = await supabase
    .from("admins")
    .select("id, role, is_active")
    .eq("id", user.id)
    .single();

  if (!admin?.is_active) return { error: "Not authorized." as const, status: 403 as const };
  if (requireFullAdmin && admin.role !== "admin") {
    return { error: "Admin role required." as const, status: 403 as const };
  }

  return { admin };
}
