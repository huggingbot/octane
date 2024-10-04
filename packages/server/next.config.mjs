import path from 'path'

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // matching all API routes
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value:
              'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version',
          },
        ],
      },
    ]
  },
  webpack: (config, { isServer, nextRuntime }) => {
    if (isServer && nextRuntime !== 'edge') {
      return {
        ...config,
        entry() {
          return config.entry().then((entry) => ({
            ...entry,
            // adding custom entry points
            cli: path.resolve(process.cwd(), 'src/lib/cli.ts'),
          }))
        },
      }
    }
    return config
  },
}

export default nextConfig
