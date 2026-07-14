/** @type {import('next').NextConfig} */
const defaultApiBaseUrl = 'http://127.0.0.1:3001'
const productionApiBaseUrl = (
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  ''
).replace(/\/$/, '')
const apiBaseUrl =
  process.env.NODE_ENV === 'production' && productionApiBaseUrl
    ? productionApiBaseUrl
    : defaultApiBaseUrl

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${apiBaseUrl}/:path*`,
      },
    ];
  },
}

export default nextConfig

