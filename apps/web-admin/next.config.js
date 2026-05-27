/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  transpilePackages: ["@scr-mesh/types", "@scr-mesh/constants", "@scr-mesh/playbooks"],
};

module.exports = nextConfig;