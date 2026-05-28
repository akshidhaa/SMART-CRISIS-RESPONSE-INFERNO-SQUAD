/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@scr-mesh/types", "@scr-mesh/constants", "@scr-mesh/playbooks"],
};

module.exports = nextConfig;