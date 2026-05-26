/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.platform === 'win32' ? undefined : 'standalone',
  transpilePackages: ["@scr-mesh/types", "@scr-mesh/constants"],
};

module.exports = nextConfig;
