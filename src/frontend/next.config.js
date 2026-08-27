const packageJson = require("./package.json");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  env: {
    NEXT_PUBLIC_APP_VERSION: `v${packageJson.version}`,
  },
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${process.env.INTERNAL_API_URL || "http://cdb-api:8000"}/api/v1/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;


