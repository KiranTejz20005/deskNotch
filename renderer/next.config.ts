import { NextConfig } from 'next'

const config: NextConfig = {
  output: 'export',
  distDir: process.env.NODE_ENV === 'production' ? '../app' : '.next',
  trailingSlash: true, // e.g. home.html => home/index.html
  images: {
    unoptimized: true,
  },
  devIndicators: false,
  allowedDevOrigins: ['192.168.1.36', 'localhost', '127.0.0.1', '192.168.0.0/16'],
}

export default config
