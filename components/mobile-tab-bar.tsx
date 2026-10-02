'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Plus, Truck, User } from 'lucide-react';

const ABAS = [
  { href: '/', label: 'Início', icon: Home },
  { href: '/acompanhar', label: 'Acompanhar', icon: Search },
  { href: '/solicitar', label: 'Solicitar', icon: Plus, destaque: true },
  { href: '/cronograma-rsu', label: 'Coleta', icon: Truck },
  { href: '/perfil', label: 'Perfil', icon: User },
];

/** Barra de navegação inferior, só no celular (padrão de aplicativo). */
export function MobileTabBar() {
  const pathname = usePathname() || '/';

  // Durante o passo a passo de nova solicitação o fluxo ocupa a tela toda
  if (pathname.startsWith('/solicitar')) return null;

  const ativa = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href) || (href === '/perfil' && ['/login', '/meus-chamados', '/admin'].some((p) => pathname.startsWith(p)));

  return (
    <nav
      aria-label="Navegação principal"
      className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid grid-cols-5 h-16">
        {ABAS.map(({ href, label, icon: Icon, destaque }) => {
          const ativo = ativa(href) || (destaque && pathname.startsWith('/nova-solicitacao'));
          if (destaque) {
            return (
              <li key={href} className="flex items-start justify-center">
                <Link
                  href={href}
                  aria-label="Nova solicitação"
                  className="-mt-5 flex flex-col items-center gap-1 active:scale-95 transition-transform"
                >
                  <span className="w-14 h-14 rounded-full bg-[#FFC20E] text-[#173b32] flex items-center justify-center shadow-lg ring-4 ring-white">
                    <Icon className="w-7 h-7" strokeWidth={2.5} />
                  </span>
                  <span className={`text-[11px] font-medium ${ativo ? 'text-[#006653]' : 'text-gray-600'}`}>{label}</span>
                </Link>
              </li>
            );
          }
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={ativo ? 'page' : undefined}
                className={`h-full flex flex-col items-center justify-center gap-1 transition-colors active:bg-gray-50 ${
                  ativo ? 'text-[#006653]' : 'text-gray-500'
                }`}
              >
                <span className={`flex items-center justify-center w-12 h-7 rounded-full transition-colors ${ativo ? 'bg-emerald-50' : ''}`}>
                  <Icon className="w-5 h-5" strokeWidth={ativo ? 2.5 : 2} />
                </span>
                <span className={`text-[11px] ${ativo ? 'font-semibold' : 'font-medium'}`}>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
