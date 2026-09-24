import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

// Read-only server client used in Server Components / route handlers that
// only need to READ public data (menu, settings). Respects RLS.
//
// IMPORTANT: Next.js's App Router patches the global `fetch` and, in
// Next.js 14, caches fetch calls by default (`cache: 'force-cache'`) unless
// told otherwise. supabase-js makes its requests through that same global
// fetch, so without this, Next can silently cache Supabase query responses
// -- which is exactly what makes admin edits look like they "don't show up"
// on the customer-facing pages until the cache expires. `export const
// revalidate = 0` on a page is supposed to cover this, but passing an
// explicit no-store fetch here removes any ambiguity: this client's
// responses are never cached, full stop, regardless of page-level config.
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
      global: {
        fetch: (url: RequestInfo | URL, options?: RequestInit) =>
          fetch(url, { ...options, cache: "no-store" }),
      },
    }
  );
}

// Client for use in Route Handlers (app/api/**/route.ts) ONLY -- never in
// Server Components (page.tsx/layout.tsx), which throw at runtime if you try
// to write cookies from them. That restriction is exactly why
// createServerReadClient()'s set/remove above are no-ops.
//
// Route Handlers, unlike Server Components, CAN write cookies. Using the
// no-op client for auth checks in API routes was a real bug: when a user's
// Supabase access token expired, auth.getUser() transparently refreshes it
// using the refresh token -- but with no-op set/remove, that refreshed
// session was never written back to the browser's cookies. Supabase rotates
// refresh tokens on use, so the *next* request would present the
// now-invalidated old refresh token and fail authentication outright --
// exactly the "logged in, but admin actions suddenly start failing" pattern.
// This client persists the refreshed session correctly.
export function createRouteHandlerClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: "", ...options });
        },
      },
    }
  );
}
