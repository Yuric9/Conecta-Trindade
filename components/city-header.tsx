'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Menu, X, ChevronDown, User, LogOut, Home, PlusCircle, LayoutDashboard, ClipboardList, LogIn, Truck, Search } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function CityHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, signOut, isAdmin } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { href: '/', label: 'Início', icon: Home },
    { href: '/acompanhar', label: 'Acompanhar', icon: Search },
    { href: '/cronograma-rsu', label: 'Coleta de Lixo', icon: Truck },
    { href: '/meus-chamados', label: 'Meus Chamados', icon: ClipboardList },
  ];

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="bg-[#005847] border-b border-white/10">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <Link href="/" className="flex items-center gap-3.5">
              <img
                src="/images/logo-trindade.png"
                alt="Prefeitura de Trindade - Onde o Futuro acontece Hoje"
                className="h-12 sm:h-14 w-auto max-w-[240px] sm:max-w-[270px] object-contain"
              />
              <div className="hidden sm:flex flex-col border-l border-white/20 pl-3 py-0.5">
                <span className="text-sm font-semibold text-white font-heading">
                  Conecta Trindade
                </span>
                <span className="text-xs text-emerald-100/80">
                  Zelo urbano
                </span>
              </div>
            </Link>

            {/* Navegação principal */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-2 text-sm font-medium transition-colors border-b-2 ${
                      active
                        ? 'text-white border-[#FFC20E]'
                        : 'text-emerald-50/90 border-transparent hover:text-white'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}

              {isAdmin && (
                <Link
                  href="/admin"
                  className={`px-3 py-2 text-sm font-medium transition-colors border-b-2 ${
                    pathname?.startsWith('/admin')
                      ? 'text-white border-[#FFC20E]'
                      : 'text-emerald-50/90 border-transparent hover:text-white'
                  }`}
                >
                  Painel Admin
                </Link>
              )}

              <Link
                href="/solicitar"
                className="ml-3 flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold bg-[#FFC20E] text-[#173b32] hover:bg-yellow-300 transition-colors"
              >
                <PlusCircle className="w-4 h-4" />
                Nova Solicitação
              </Link>
            </nav>

            {/* Menu do usuário / Login */}
            <div className="hidden md:flex items-center gap-2">
              {profile ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-white/10 text-white text-sm font-medium transition-colors">
                      <div className="w-7 h-7 rounded-full bg-white/30 flex items-center justify-center">
                        <User className="w-4 h-4" />
                      </div>
                      <span className="max-w-[120px] truncate">{profile.nome || 'Cidadão'}</span>
                      <ChevronDown className="w-4 h-4 text-emerald-200" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={handleSignOut} className="text-red-600 cursor-pointer">
                      <LogOut className="w-4 h-4 mr-2" />
                      Sair
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-white hover:bg-white/10 transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  Entrar
                </Link>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden text-white p-2"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="md:hidden border-t border-white/20 bg-[#005847]">
            <div className="px-4 py-3 space-y-2">
              <Link
                href="/solicitar"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-md text-sm font-semibold bg-[#FFC20E] text-[#173b32] mb-2"
              >
                <PlusCircle className="w-5 h-5" />
                Nova Solicitação
              </Link>
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                      active ? 'bg-white/20 text-white' : 'text-white hover:bg-white/10'
                    }`}
                  >
                    <Icon className="w-5 h-5 text-emerald-100/80" />
                    {item.label}
                  </Link>
                );
              })}
              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium text-white hover:bg-white/10"
                >
                  <LayoutDashboard className="w-5 h-5 text-emerald-100/80" />
                  Painel Admin
                </Link>
              )}
              {profile ? (
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    handleSignOut();
                  }}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-200 hover:bg-white/10 w-full"
                >
                  <LogOut className="w-5 h-5" />
                  Sair
                </button>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium text-white hover:bg-white/10"
                >
                  <User className="w-5 h-5" />
                  Entrar
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

export function CityFooter() {
  return (
    <footer className="bg-[#005847] text-white">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <img
              src="/images/logo-trindade.png"
              alt="Trindade - Onde o Futuro acontece Hoje"
              className="h-12 w-auto max-w-[220px] object-contain mb-3"
            />
            <p className="text-emerald-50/80 text-sm leading-relaxed">
              Conecta Trindade: registre e acompanhe solicitações de zelo urbano na cidade.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-3">Serviços</h4>
            <ul className="space-y-2 text-sm text-emerald-50/80">
              <li>
                <Link href="/solicitar" className="hover:text-white transition-colors">
                  Nova solicitação
                </Link>
              </li>
              <li>
                <Link href="/acompanhar" className="hover:text-white transition-colors">
                  Acompanhar protocolo
                </Link>
              </li>
              <li>
                <Link href="/cronograma-rsu" className="hover:text-white transition-colors">
                  Coleta de lixo por bairro
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-3">Canais da Prefeitura de Trindade</h4>
            <ul className="space-y-2 text-sm text-emerald-50/80">
              <li>(62) 3506-7000</li>
              <li>ouvidoria@trindade.go.gov.br</li>
              <li>Av. Goiás, Centro - Trindade/GO</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/20 mt-8 pt-4 text-xs text-emerald-50/70 text-center">
          Conecta Trindade é um projeto independente e não substitui os canais oficiais da Prefeitura.
        </div>
      </div>
    </footer>
  );
}
