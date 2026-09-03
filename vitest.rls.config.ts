import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * RLS テスト専用の設定。
 *
 * ローカルの Supabase が起動していないと失敗するため、通常のテスト実行からは外し、
 * こちらでだけ実行する（npm run test:rls）。
 *
 * vitest.config.ts を mergeConfig で継承しない理由:
 * mergeConfig は配列を「連結」するため、基本設定の exclude に入れた
 * **∕*.rls.test.ts が残り、実行対象が空になってしまう。
 * 重複は数行なので、独立した設定として書くほうが挙動が明快。
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  // .env.local の値を import.meta.env から読めるようにする（接続先に使う）。
  envPrefix: ["NEXT_PUBLIC_"],
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.rls.test.ts"],
  },
});
