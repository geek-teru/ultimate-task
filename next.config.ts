import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 親ディレクトリの探索を無効化
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
