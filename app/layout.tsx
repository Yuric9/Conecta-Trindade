import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter, Montserrat } from 'next/font/google';
import { LayoutWrapper } from './layout-wrapper';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const montserrat = Montserrat({ subsets: ['latin'], variable: '--font-montserrat', weight: ['400', '500', '600', '700', '800'] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: 'Conecta Trindade - Zelo Urbano',
  description: 'Registre e acompanhe solicitações de iluminação, buracos, limpeza e outros serviços urbanos em Trindade-GO.',
  applicationName: 'Conecta Trindade',
  appleWebApp: {
    capable: true,
    title: 'Conecta Trindade',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: [
      { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
  openGraph: {
    title: 'Conecta Trindade - Zelo Urbano',
    description: 'Registre e acompanhe solicitações de zelo urbano em Trindade-GO.',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#005847',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} ${montserrat.variable} font-sans`}>
        <LayoutWrapper>{children}</LayoutWrapper>
      </body>
    </html>
  );
}
