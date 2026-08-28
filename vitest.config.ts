import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    globals: true,
    // .test.ts,.test.tsxファイルをテストファイルとみなす
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
