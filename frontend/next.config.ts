import type { NextConfig } from "next";
import path from "node:path";

const isProd = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  output: 'export',
  basePath: isProd ? '/RiskGuard' : '',
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;

