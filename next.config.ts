import type { NextConfig } from 'next';
import { wgslTurbopackRule } from '@vgpu/wgsl/next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.ctfassets.net',
      },
    ],
  },
  turbopack: {
    rules: {
      // Prepares .wgsl imports for vgpu at build time, so the browser never parses WGSL.
      '*.wgsl': wgslTurbopackRule({ minify: true }),
    },
  },
};

export default nextConfig;
