const path = require("path");

const FLASK_API_BASE_URL =
  process.env.FLASK_API_BASE_URL ||
  "http://192.168.0.187:5000";

const AI_VM_BASE_URL =
  process.env.AI_VM_BASE_URL ||
  "http://192.168.0.186:5001";

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  devIndicators: false,

  // Socket.IO endpoint needs trailing slash.
  // Prevent Next from redirecting /socket.io/ -> /socket.io.
  skipTrailingSlashRedirect: true,

  async rewrites() {
    return [
      {
        source: "/backend-api/:path*",
        destination: `${FLASK_API_BASE_URL.replace(/\/$/, "")}/:path*`,
      },
      {
        source: "/socket.io",
        destination: `${FLASK_API_BASE_URL.replace(/\/$/, "")}/socket.io/`,
      },
      {
        source: "/socket.io/:path*",
        destination: `${FLASK_API_BASE_URL.replace(/\/$/, "")}/socket.io/:path*`,
      },
      {
        source: "/ai-vm/:path*",
        destination: `${AI_VM_BASE_URL.replace(/\/$/, "")}/:path*`,
      },
      {
        source: "/events/:path*",
        destination: `${AI_VM_BASE_URL.replace(/\/$/, "")}/events/:path*`,
      },
      {
        source: "/snapshots/:path*",
        destination: `${AI_VM_BASE_URL.replace(/\/$/, "")}/snapshots/:path*`,
      },
      {
        source: "/streams/:path*",
        destination: `${AI_VM_BASE_URL.replace(/\/$/, "")}/streams/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
