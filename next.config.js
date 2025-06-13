/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Desabilitar verificação de ESLint durante o build
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
