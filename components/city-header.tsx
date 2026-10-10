'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronDown, User, LogOut, Home, PlusCircle, LayoutDashboard, ClipboardList, LogIn, Truck, Search, HardHat } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { papelOS } from '@/lib/os-status';
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
  const { profile, signOut } = useAuth();
  // Equipe (admin, central, Secretaria) volta ao painel por aqui
  const papel = papelOS(profile);
  const painel =
    papel === 'admin'
      ? 'Painel Admin'
      : papel === 'central'
        ? 'Painel da Central'
        : papel === 'secretaria'
          ? 'Painel da Secretaria'
          : null;

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
          <div className="flex items-center justify-between h-14 md:h-20 pt-[env(safe-area-inset-top)] md:pt-0">
            <Link href="/" className="flex items-center gap-3.5">
              <img
                src="/images/logo-trindade.png"
                alt="Prefeitura de Trindade - Onde o Futuro acontece Hoje"
                className="h-9 md:h-14 w-auto max-w-[180px] md:max-w-[270px] object-contain"
              />
              <div className="hidden md:flex flex-col border-l border-white/20 pl-3 py-0.5">
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

              {profile?.role === 'coordenador' && (
                <Link
                  href="/coordenador"
                  className={`px-3 py-2 text-sm font-medium transition-colors border-b-2 ${
                    pathname?.startsWith('/coordenador')
                      ? 'text-white border-[#FFC20E]'
                      : 'text-emerald-50/90 border-transparent hover:text-white'
                  }`}
                >
                  Minhas O.S.
                </Link>
              )}

              {painel && (
                <Link
                  href="/admin"
                  className={`px-3 py-2 text-sm font-medium transition-colors border-b-2 ${
                    pathname?.startsWith('/admin')
                      ? 'text-white border-[#FFC20E]'
                      : 'text-emerald-50/90 border-transparent hover:text-white'
                  }`}
                >
                  {painel}
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
                  <DropdownMenuContent align="end" className="w-52">
                    {painel && (
                      <DropdownMenuItem onClick={() => router.push('/admin')} className="cursor-pointer">
                        <LayoutDashboard className="w-4 h-4 mr-2" />
                        {painel}
                      </DropdownMenuItem>
                    )}
                    {papel === 'coordenador' && (
                      <DropdownMenuItem onClick={() => router.push('/coordenador')} className="cursor-pointer">
                        <HardHat className="w-4 h-4 mr-2" />
                        Minhas O.S.
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => router.push('/perfil')} className="cursor-pointer">
                      <User className="w-4 h-4 mr-2" />
                      Meu perfil e senha
                    </DropdownMenuItem>
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

          </div>
        </div>

      </div>
    </header>
  );
}

export function CityFooter() {
  return (
    <footer className="hidden md:block bg-[#005847] text-white">
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
          © {new Date().getFullYear()} Conecta Trindade · Desenvolvido por{' '}
          <span className="font-semibold text-emerald-50">YC Soluções Tecnologia</span>
        </div>
      </div>
    </footer>
  );
}
