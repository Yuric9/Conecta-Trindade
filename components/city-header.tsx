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
    { href: '/cronograma-rsu', label: 'Coleta RSU', icon: Truck },
    { href: '/meus-chamados', label: 'Meus Chamados', icon: ClipboardList },
  ];

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-50 w-full shadow-md">
      <div className="bg-gradient-to-r from-[#006653] via-[#005847] to-[#004d3e] border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-20">
            {/* Logo oficial da prefeitura */}
            <Link href="/" className="flex items-center gap-3.5 group">
              <img
                src="/images/logo-trindade.png"
                alt="Prefeitura de Trindade - Onde o Futuro acontece Hoje"
                className="h-12 sm:h-14 w-auto max-w-[240px] sm:max-w-[270px] object-contain drop-shadow-sm transition-transform group-hover:scale-[1.02]"
              />
              <div className="hidden sm:flex flex-col border-l border-white/20 pl-3 py-0.5">
                <span className="text-xs font-bold text-white tracking-wide uppercase font-heading">
                  Zelo Urbano
                </span>
                <span className="text-[10px] text-emerald-200 font-medium">
                  Atendimento ao Cidadão
                </span>
              </div>
            </Link>

            {/* Navegação principal do aplicativo com alto contraste e clareza */}
            <nav className="hidden md:flex items-center gap-2.5">
              <Link
                href="/"
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                  pathname === '/'
                    ? 'bg-white/25 text-white shadow-sm ring-1 ring-white/30'
                    : 'bg-white/10 text-white hover:bg-white/20 hover:text-white border border-white/10'
                }`}
              >
                <Home className="w-4 h-4 text-emerald-200" />
                Início
              </Link>

              <Link
                href="/acompanhar"
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                  pathname === '/acompanhar'
                    ? 'bg-white/25 text-white shadow-sm ring-1 ring-white/30'
                    : 'bg-white/10 text-white hover:bg-white/20 hover:text-white border border-white/10'
                }`}
              >
                <Search className="w-4 h-4 text-emerald-200" />
                Acompanhar
              </Link>

              <Link
                href="/cronograma-rsu"
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                  pathname === '/cronograma-rsu'
                    ? 'bg-white/25 text-white shadow-sm ring-1 ring-white/30'
                    : 'bg-white/10 text-white hover:bg-white/20 hover:text-white border border-white/10'
                }`}
              >
                <Truck className="w-4 h-4 text-emerald-200" />
                Coleta RSU
              </Link>

              <Link
                href="/meus-chamados"
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                  pathname === '/meus-chamados'
                    ? 'bg-white/25 text-white shadow-sm ring-1 ring-white/30'
                    : 'bg-white/10 text-white hover:bg-white/20 hover:text-white border border-white/10'
                }`}
              >
                <ClipboardList className="w-4 h-4 text-emerald-200" />
                Meus Chamados
              </Link>

              <Link
                href="/solicitar"
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] ${
                  pathname === '/solicitar' || pathname === '/nova-solicitacao'
                    ? 'bg-yellow-300 text-[#173b32] ring-2 ring-white/50'
                    : 'bg-[#FFC20E] text-[#173b32] hover:bg-yellow-300'
                }`}
              >
                <PlusCircle className="w-4 h-4" />
                Nova Solicitação
              </Link>

              {isAdmin && (
                <Link
                  href="/admin"
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                    pathname?.startsWith('/admin')
                      ? 'bg-white/25 text-white shadow-sm ring-1 ring-white/30'
                      : 'bg-emerald-900/60 text-emerald-100 hover:bg-emerald-900/90 hover:text-white border border-emerald-400/30'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4 text-emerald-300" />
                  Painel Admin
                </Link>
              )}
            </nav>

            {/* Menu do usuário / Login */}
            <div className="hidden md:flex items-center gap-2">
              {profile ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-all border border-white/15">
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
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium text-white bg-white/10 hover:bg-white/20 border border-white/25 transition-all shadow-sm"
                >
                  <LogIn className="w-4 h-4 text-emerald-200" />
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
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-bold bg-[#FFC20E] text-[#173b32] shadow-sm mb-2"
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
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${
                      active ? 'bg-white/25 text-white shadow-sm ring-1 ring-white/30' : 'text-white bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    <Icon className="w-5 h-5 text-emerald-200" />
                    {item.label}
                  </Link>
                );
              })}
              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold text-emerald-100 bg-emerald-900/60 hover:bg-emerald-900/90 border border-emerald-400/30"
                >
                  <LayoutDashboard className="w-5 h-5 text-emerald-300" />
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
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-white bg-white/10 hover:bg-white/20"
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
    <footer className="bg-[#005847] text-white mt-12">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <img
                src="/images/logo-trindade.png"
                alt="Prefeitura de Trindade - Onde o Futuro acontece Hoje"
                className="h-12 w-auto max-w-[220px] object-contain"
              />
            </div>
            <p className="text-emerald-50 text-xs leading-relaxed">
              Plataforma municipal de zelo urbano. Registre e acompanhe solicitações de serviços públicos.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-3 font-heading">Serviços</h4>
            <ul className="space-y-2 text-xs text-emerald-50">
              <li>
                <Link href="/acompanhar" className="hover:text-yellow-300 font-medium transition-colors">
                  🔍 Consultar Demanda / Protocolo
                </Link>
              </li>
              <li>
                <Link href="/cronograma-rsu" className="hover:text-yellow-300 font-medium transition-colors">
                  🚛 Cronograma de Coleta RSU
                </Link>
              </li>
              <li>Iluminação Pública</li>
              <li>Reparo de Buracos</li>
              <li>Limpeza Urbana</li>
              <li>Saneamento e Vazamentos</li>
              <li>Podas de Árvores</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-3 font-heading">Contato</h4>
            <ul className="space-y-2 text-xs text-emerald-50">
              <li>(62) 3506-7000</li>
              <li>ouvidoria@trindade.go.gov.br</li>
              <li>Av. Goiás, Centro - Trindade/GO</li>
              <li>CEP 75388-412</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/20 mt-6 pt-4 text-center text-xs text-emerald-100">
          © 2026 Prefeitura Municipal de Trindade - Goiás. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}
