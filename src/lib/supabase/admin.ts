import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// SERVICE ROLE client — server-only. Never import this into any file that
// could end up in a client bundle. Used exclusively by API routes that need
// to write authoritative records (orders, payments, sales rollups) after
// validating/recomputing everything server-side. Bypasses RLS by design.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Supabase service role client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
