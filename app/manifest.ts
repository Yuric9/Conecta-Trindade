import type { MetadataRoute } from 'next';

/** Manifesto do app: permite "Adicionar à tela inicial" e abrir em tela cheia. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Conecta Trindade',
    short_name: 'Conecta Trindade',
    description: 'Registre e acompanhe solicitações de zelo urbano em Trindade-GO.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#eef1ef',
    theme_color: '#005847',
    lang: 'pt-BR',
    categories: ['utilities', 'government'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Nova solicitação', url: '/solicitar', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Acompanhar protocolo', url: '/acompanhar', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
    ],
  };
}
