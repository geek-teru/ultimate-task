import { createBrowserClient } from "@supabase/ssr";

/**
 * Client Component から使う Supabase クライアント。
 * セッションはブラウザの Cookie から読む。
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
