import { NextResponse } from "next/server";

// Used in a catch block around every route handler body. Without this,
// an uncaught throw (e.g. createAdminClient() throwing when
// SUPABASE_SERVICE_ROLE_KEY is missing/wrong) becomes a bare 500 with no
// body Next.js's default error handling produces -- which is exactly what
// made an earlier failure show as an unhelpful "Save failed (HTTP 500)."
// on the client. This always logs full detail server-side (visible in
// `npm run dev`'s terminal or Vercel's function logs) and returns the
// message to the client too, since these are all admin-only /api/admin/*
// or already-authenticated routes -- not customer-facing, so it's fine
// (and useful) to be specific here.
//
// IMPORTANT: Next.js uses thrown errors as an internal control-flow signal
// for a few of its own features -- e.g. calling `cookies()` inside a route
// Next is trying to statically analyze at build time throws a special
// DYNAMIC_SERVER_USAGE error to say "this route must be dynamic," and
// `redirect()`/`notFound()` work the same way (NEXT_REDIRECT/
// NEXT_NOT_FOUND). These aren't real errors and must be allowed to keep
// propagating -- swallowing them here would be caught correctly by luck in
// some Next versions but is fragile and prints a scary, misleading stack
// trace during `next build`. Every route's catch block should call this
// function first and return its result only for genuine errors.
export function handleApiError(context: string, err: unknown): NextResponse {
  if (isNextControlFlowError(err)) {
    throw err;
  }

  console.error(`[API] ${context}:`, err);
  const message =
    err instanceof Error ? err.message : "Unknown server error -- see server logs.";
  return NextResponse.json({ error: message }, { status: 500 });
}

export function isNextControlFlowError(err: unknown): boolean {
  const digest = (err as { digest?: unknown })?.digest;
  if (typeof digest !== "string") return false;
  // NEXT_REDIRECT, NEXT_NOT_FOUND, etc. share the NEXT_ prefix;
  // DYNAMIC_SERVER_USAGE (thrown by cookies()/headers() during static
  // analysis) does not, so it's checked separately.
  return digest.startsWith("NEXT_") || digest === "DYNAMIC_SERVER_USAGE";
}
