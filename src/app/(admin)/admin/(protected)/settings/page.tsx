import { createServerReadClient } from "@/lib/supabase/server";
import { SettingsForm } from "@/components/admin/SettingsForm";
import type { BusinessSettings } from "@/lib/types";

export const revalidate = 0;
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const supabase = createServerReadClient();
  const { data: settings } = await supabase.from("business_settings").select("*").single();

  return <SettingsForm initial={settings as BusinessSettings} />;
}
