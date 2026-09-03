import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  // .env.local の値を import.meta.env から読めるようにする（RLS テストが接続先に使う）。
  envPrefix: ["NEXT_PUBLIC_"],
  test: {
    environment: "node",
    globals: true,
    // .test.ts,.test.tsxファイルをテストファイルとみなす
    include: ["src/**/*.test.{ts,tsx}"],
    // RLS テストはローカルの Supabase が起動している必要があるため、
    // 通常のテスト実行からは外す。実行は npm run test:rls。
    exclude: ["**/node_modules/**", "**/*.rls.test.ts"],
  },
});
