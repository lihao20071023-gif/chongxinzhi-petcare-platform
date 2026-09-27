import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'export',
  trailingSlash: true,
  // 静态交付文件使用相对资源路径；开发服务器保持根路径，避免 /hospital/ 等路由丢失样式。
  assetPrefix: process.env.NODE_ENV === 'production' ? './' : undefined,
};
export default nextConfig;
