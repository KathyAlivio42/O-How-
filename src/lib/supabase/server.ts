import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Read-only server client used in Server Components / route handlers that
// only need to READ public data (menu, settings). Respects RLS.
export function createServerReadClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        // No-ops: this client is never used to mutate auth state.
        set() {},
        remove() {},
      },
    }
  );
}
