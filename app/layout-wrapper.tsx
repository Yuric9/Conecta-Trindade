'use client';

import { AuthProvider } from '@/lib/auth-context';
import { CityHeader, CityFooter } from '@/components/city-header';
import { MobileTabBar } from '@/components/mobile-tab-bar';

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col bg-[#eef1ef]">
        <CityHeader />
        {/* No celular, espaço para a barra inferior não cobrir o conteúdo */}
        <main className="flex-1 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">{children}</main>
        <CityFooter />
        <MobileTabBar />
      </div>
    </AuthProvider>
  );
}
