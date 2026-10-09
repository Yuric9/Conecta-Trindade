'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, ClipboardList, LayoutDashboard, LogIn, LogOut, Phone, Mail, MapPin, Info, User, HardHat, KeyRound } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

const PAPEIS_EQUIPE = ['admin', 'gestor', 'fiscal', 'atendente'];

function Linha({ href, icon: Icon, children }: { href: string; icon: typeof User; children: React.ReactNode }) {
  return (
    <Link href={href} className="flex items-center gap-3 px-4 py-3.5 bg-white active:bg-gray-50 transition-colors">
      <Icon className="w-5 h-5 text-[#006653]" />
      <span className="flex-1 text-[15px] text-gray-900">{children}</span>
      <ChevronRight className="w-4 h-4 text-gray-400" />
    </Link>
  );
}

export default function PerfilPage() {
  const { profile, loading, signOut } = useAuth();
  const router = useRouter();
  const daEquipe = PAPEIS_EQUIPE.includes(profile?.role || '');

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      {/* Identificação */}
      <section className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-[#006653] text-white flex items-center justify-center text-xl font-semibold">
          {profile?.nome ? profile.nome.charAt(0).toUpperCase() : <User className="w-6 h-6" />}
        </div>
        <div className="min-w-0">
          {loading ? (
            <p className="text-gray-500">Carregando...</p>
          ) : profile ? (
            <>
              <p className="text-lg font-semibold text-gray-900 truncate">{profile.nome}</p>
              <p className="text-sm text-gray-500 truncate">{profile.email}</p>
            </>
          ) : (
            <>
              <p className="text-lg font-semibold text-gray-900">Você não entrou</p>
              <p className="text-sm text-gray-500">Entre para ver seus chamados.</p>
            </>
          )}
        </div>
      </section>

      {/* Ações da conta */}
      <section className="rounded-xl overflow-hidden border border-gray-200 divide-y divide-gray-100">
        {profile ? (
          <>
            <Linha href="/meus-chamados" icon={ClipboardList}>Meus chamados</Linha>
            <Linha href="/redefinir-senha" icon={KeyRound}>Trocar minha senha</Linha>
            {daEquipe && <Linha href="/admin" icon={LayoutDashboard}>Painel de gestão</Linha>}
            {profile?.role === 'coordenador' && <Linha href="/coordenador" icon={HardHat}>Minhas O.S. (coordenador)</Linha>}
            <button
              type="button"
              onClick={async () => {
                await signOut();
                router.push('/');
              }}
              className="w-full flex items-center gap-3 px-4 py-3.5 bg-white text-red-600 active:bg-gray-50"
            >
              <LogOut className="w-5 h-5" />
              <span className="flex-1 text-left text-[15px]">Sair</span>
            </button>
          </>
        ) : (
          <Linha href="/login" icon={LogIn}>Entrar ou criar conta</Linha>
        )}
      </section>

      {/* Sobre e contatos (no computador ficam no rodapé) */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 px-1 mb-2">Canais da Prefeitura de Trindade</h2>
        <div className="rounded-xl overflow-hidden border border-gray-200 divide-y divide-gray-100 bg-white">
          <a href="tel:+556235067000" className="flex items-center gap-3 px-4 py-3.5 active:bg-gray-50">
            <Phone className="w-5 h-5 text-[#006653]" />
            <span className="text-[15px] text-gray-900">(62) 3506-7000</span>
          </a>
          <a href="mailto:ouvidoria@trindade.go.gov.br" className="flex items-center gap-3 px-4 py-3.5 active:bg-gray-50">
            <Mail className="w-5 h-5 text-[#006653]" />
            <span className="text-[15px] text-gray-900">ouvidoria@trindade.go.gov.br</span>
          </a>
          <div className="flex items-center gap-3 px-4 py-3.5">
            <MapPin className="w-5 h-5 text-[#006653]" />
            <span className="text-[15px] text-gray-900">Av. Goiás, Centro - Trindade/GO</span>
          </div>
        </div>
      </section>

      <p className="flex gap-2 text-xs text-gray-500 px-1">
        <Info className="w-4 h-4 flex-shrink-0" />
        Conecta Trindade é um projeto independente e não substitui os canais oficiais da Prefeitura.
      </p>
    </div>
  );
}
