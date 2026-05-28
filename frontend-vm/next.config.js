/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  async rewrites() {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

    if (!apiBaseUrl) return [];

    return [
      {
        source: "/backend-api/:path*",
        destination: `${apiBaseUrl}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
