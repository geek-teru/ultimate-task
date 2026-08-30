import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Google 認証後の戻り先。
 *
 * Supabase から `?code=...` 付きでここへ戻ってくるので、
 * その認可コードをセッションに交換して Cookie に保存する。
 *
 * Server Component ではなく Route Handler にしているのは、
 * Cookie の書き込みが必要なため（Server Component からは書き込めない）。
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // コードが無い、または交換に失敗した場合はログイン画面へ戻す。
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
