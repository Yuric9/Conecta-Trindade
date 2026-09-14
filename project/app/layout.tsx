import './globals.css';
import type { Metadata } from 'next';
import { Inter, Montserrat } from 'next/font/google';
import { LayoutWrapper } from './layout-wrapper';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const montserrat = Montserrat({ subsets: ['latin'], variable: '--font-montserrat', weight: ['400', '500', '600', '700', '800'] });

export const metadata: Metadata = {
  title: 'Conecta Trindade - Zelo Urbano | Prefeitura de Trindade',
  description: 'Plataforma municipal de zelo urbano de Trindade-GO. Registre e acompanhe solicitações de iluminação, buracos, limpeza e mais.',
  openGraph: {
    title: 'Conecta Trindade - Zelo Urbano',
    description: 'Plataforma municipal de zelo urbano de Trindade-GO',
  },
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
