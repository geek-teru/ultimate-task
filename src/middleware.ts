import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Next.js はこのファイルだけを Middleware として認識する。
 * 実処理は lib 側に置き、ここは入口に徹する。
 */
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * 静的アセットには認証が不要なので除外する。
     * 全リクエストで getUser() を呼ぶと Supabase への問い合わせが無駄に増える。
     * - _next/static  ビルド成果物
     * - _next/image   画像最適化
     * - favicon.ico
     * - 画像ファイル
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
