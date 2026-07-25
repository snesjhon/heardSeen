import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

// Service-role client -- bypasses RLS entirely. Never import this from
// client components or anything reachable from the browser bundle. Used only
// by the seed scripts (run standalone via tsx, outside the Next.js build --
// which is why this deliberately does NOT `import "server-only"`: that guard
// only works inside Next's webpack pipeline and throws under plain Node) and,
// if added later, trusted server-only admin routes.
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
