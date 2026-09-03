import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: true,
  // WSL 1 drops piped stdout from detached subprocesses. The in-process API is
  // equivalent here and keeps Next's own type validation enabled.
  experimental: { useTypeScriptCli: false, cpus: 1, workerThreads: true },
  headers: async () => {
    const common = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ];
    return [{ source: "/:path*", headers: common }];
  },
};

export default nextConfig;
