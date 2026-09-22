'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

const STAFF_ROLES = new Set(['admin', 'servidor', 'fiscal', 'gestor', 'atendente']);

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { profile, loading } = useAuth();

  useEffect(() => {
    if (!loading && (!profile || !STAFF_ROLES.has(profile.role))) {
      router.replace('/login?unauthorized=admin');
    }
  }, [loading, profile, router]);

  if (loading || !profile || !STAFF_ROLES.has(profile.role)) {
    return <div className="min-h-screen bg-[#F4F6F8]" aria-label="Verificando autorização" />;
  }

  return children;
}
