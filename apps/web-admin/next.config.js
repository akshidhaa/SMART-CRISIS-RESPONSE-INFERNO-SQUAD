const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@scr-mesh/types", "@scr-mesh/constants", "@scr-mesh/playbooks"],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@scr-mesh/types': path.resolve(__dirname, '../../shared/types/src/index.ts'),
      '@scr-mesh/constants': path.resolve(__dirname, '../../shared/constants/src/index.ts'),
      '@scr-mesh/playbooks': path.resolve(__dirname, '../../shared/playbooks/src/index.ts'),
    };
    return config;
  },
};

module.exports = nextConfig;