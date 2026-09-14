'use client';

import { AuthProvider } from '@/lib/auth-context';
import { CityHeader, CityFooter } from '@/components/city-header';

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col bg-[#F4F6F8]">
        <CityHeader />
        <main className="flex-1">{children}</main>
        <CityFooter />
      </div>
    </AuthProvider>
  );
}
