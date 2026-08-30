"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * ログアウトする。
 *
 * Server Action はレスポンスを組み立てる前に動くため Cookie を書き込める。
 * Server Component ではこれができないので、更新系はここに置く。
 */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  // Server Component が持っているキャッシュを破棄しないと、
  // ログアウト後も古いプロフィールが表示されうる。
  revalidatePath("/", "layout");
  redirect("/login");
}
