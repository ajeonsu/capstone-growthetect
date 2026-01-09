/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    DB_HOST: process.env.DB_HOST || 'localhost',
    DB_USER: process.env.DB_USER || 'root',
    DB_PASS: process.env.DB_PASS || '',
    DB_NAME: process.env.DB_NAME || 'growthetect_db',
    DB_PORT: process.env.DB_PORT || '3306',
    JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  },
}

module.exports = nextConfig
