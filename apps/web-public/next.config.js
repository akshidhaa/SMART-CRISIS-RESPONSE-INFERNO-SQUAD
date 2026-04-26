/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ["@scr-mesh/types", "@scr-mesh/constants"],
};

module.exports = nextConfig;
