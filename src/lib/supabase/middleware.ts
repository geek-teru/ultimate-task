import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Middleware でセッションを更新する。
 *
 * Supabase のアクセストークンには有効期限があり、放置すると切れる。
 * Server Component は Cookie を書き込めないため、リクエストのたびに
 * ここでトークンを更新し、新しい Cookie をレスポンスに載せる。
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // getSession() ではなく getUser() を使う。
  // getSession() は Cookie の中身をそのまま信用するが、getUser() は
  // Supabase に問い合わせてトークンを検証するため、サーバー側の判定に使える。
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 未ログインならログイン画面へ送る。
  // /login と /auth/* は未ログインでもアクセスできる必要がある。
  const { pathname } = request.nextUrl;
  const isPublicPath = pathname.startsWith("/login") || pathname.startsWith("/auth");

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
