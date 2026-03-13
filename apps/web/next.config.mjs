/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@stitch/db'],
  // Allow large PDF uploads (up to 20MB)
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb',
    },
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'img.clerk.com' },
    ],
  },
}

export default nextConfig
