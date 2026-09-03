/**
 * Vitest（Vite）経由で参照する環境変数の型。
 *
 * vitest.config.ts の envPrefix で NEXT_PUBLIC_ を許可しているため
 * import.meta.env から実際に読めるが、Next.js の型定義には含まれないため
 * ここで宣言する。アプリ本体は process.env を使うので影響しない。
 */
interface ImportMetaEnv {
  readonly NEXT_PUBLIC_SUPABASE_URL: string;
  readonly NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
