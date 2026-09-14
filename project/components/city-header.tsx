'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Menu, X, MapPin, Phone, ChevronDown, User, LogOut, Home, FileText, LayoutDashboard, Search, Info } from 'lucide-react';
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
    { href: '/nova-solicitacao', label: 'Nova Solicitação', icon: FileText },
    { href: '/meus-chamados', label: 'Meus Chamados', icon: LayoutDashboard },
  ];

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="bg-[#006653] text-white px-4 hidden sm:block">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <nav className="flex items-center gap-7 h-12 text-sm font-semibold">
            {['Início', 'Cidade', 'Governo', 'Serviços', 'Notícias', 'Transparência', 'Fale Conosco'].map((item) => (
              <a key={item} href={item === 'Início' ? '/' : '#'} className="text-emerald-50 hover:text-[#FFC20E] transition-colors">
                {item}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 rounded-md bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/20" aria-label="Buscar no portal">
              <Search className="w-4 h-4" />
              Buscar
            </button>
            <button className="flex items-center gap-2 rounded-md bg-[#FFC20E] px-3 py-2 text-xs font-bold text-[#173b32] hover:bg-yellow-300">
              <Info className="w-4 h-4" />
              Acesso à informação
            </button>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-[#006653] via-[#005847] to-[#004d3e] shadow-[0_8px_25px_rgba(0,55,43,0.25)] border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-18 py-3">
            <Link href="/" className="flex items-center gap-3 group">
              <img
                src="/images/logo-trindade.png"
                alt="Prefeitura de Trindade"
                className="h-14 w-auto max-w-[220px] object-contain transition-transform group-hover:scale-105"
              />
              <span className="sr-only">Conecta Trindade - Zelo Urbano</span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      active
                        ? 'bg-white/15 text-white shadow-inner ring-1 ring-white/10'
                        : 'text-emerald-50 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
              {isAdmin && (
                <Link
                  href="/admin"
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    pathname?.startsWith('/admin')
                      ? 'bg-white/15 text-white shadow-inner ring-1 ring-white/10'
                      : 'text-emerald-50 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Painel Admin
                </Link>
              )}
            </nav>

            {/* User menu */}
            <div className="hidden md:block">
              {profile ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-all">
                      <div className="w-7 h-7 rounded-full bg-white/30 flex items-center justify-center">
                        <User className="w-4 h-4" />
                      </div>
                      <span className="max-w-[120px] truncate">{profile.nome || 'Cidadão'}</span>
                      <ChevronDown className="w-4 h-4" />
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
                <Link href="/login">
                  <Button size="sm" variant="secondary" className="bg-[#FFC20E] text-[#173b32] hover:bg-yellow-300 font-semibold">
                    Entrar
                  </Button>
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
            <div className="px-4 py-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                      active ? 'bg-white/20 text-white' : 'text-emerald-50 hover:bg-white/10'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                );
              })}
              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-emerald-50 hover:bg-white/10"
                >
                  <LayoutDashboard className="w-5 h-5" />
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
                alt="Prefeitura de Trindade"
                className="h-12 w-auto max-w-[190px] object-contain"
              />
              <div>
                <p className="text-emerald-100 text-xs">Capital da Fé</p>
              </div>
            </div>
            <p className="text-emerald-50 text-xs leading-relaxed">
              Plataforma municipal de zelo urbano. Registre e acompanhe solicitações de serviços públicos.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-3 font-heading">Serviços</h4>
            <ul className="space-y-2 text-xs text-emerald-50">
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
