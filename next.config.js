/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  distDir: process.env.NODE_ENV === 'development' ? '.next_dev' : '.next',
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  // Cabeçalhos de proteção em todas as páginas
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Ninguém coloca o site dentro de outro site para enganar o usuário
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Links para fora não levam o endereço completo da página (ex.: protocolo)
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Câmera e localização só para o próprio site
          { key: 'Permissions-Policy', value: 'camera=(self), geolocation=(self), microphone=()' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
