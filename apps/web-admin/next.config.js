/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ["@scr-mesh/types", "@scr-mesh/constants", "@scr-mesh/playbooks"],
};

module.exports = nextConfig;
