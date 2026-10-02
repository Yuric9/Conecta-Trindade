'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  ClipboardList,
  MapPinned,
  UsersRound,
  Menu,
  Building2,
  Truck,
  BarChart3,
  Settings,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export type AbaAdmin = 'dashboard' | 'chamados' | 'usuarios' | 'orgaos' | 'mapa' | 'rsu' | 'relatorios' | 'configuracoes';

const PRINCIPAIS: { id: AbaAdmin; label: string; icon: typeof Menu }[] = [
  { id: 'dashboard', label: 'Visão geral', icon: LayoutDashboard },
  { id: 'chamados', label: 'O.S.', icon: ClipboardList },
  { id: 'mapa', label: 'Mapa', icon: MapPinned },
  { id: 'usuarios', label: 'Usuários', icon: UsersRound },
];

const OUTRAS: { id: AbaAdmin; label: string; icon: typeof Menu }[] = [
  { id: 'orgaos', label: 'Prédios públicos', icon: Building2 },
  { id: 'rsu', label: 'Coleta de lixo', icon: Truck },
  { id: 'relatorios', label: 'Relatórios', icon: BarChart3 },
  { id: 'configuracoes', label: 'Configurações', icon: Settings },
];

/** Navegação do painel de gestão no celular (barra inferior + "Mais"). */
export function AdminMobileNav({
  aba,
  onSelecionar,
  totalChamados,
}: {
  aba: AbaAdmin;
  onSelecionar: (aba: AbaAdmin) => void;
  totalChamados: number;
}) {
  const [maisAberto, setMaisAberto] = useState(false);
  const emOutra = OUTRAS.some((o) => o.id === aba);

  return (
    <>
      <nav
        aria-label="Seções do painel"
        className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="grid grid-cols-5 h-16">
          {PRINCIPAIS.map(({ id, label, icon: Icon }) => {
            const ativo = aba === id;
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelecionar(id);
                    window.scrollTo({ top: 0 });
                  }}
                  aria-current={ativo ? 'page' : undefined}
                  className={`relative w-full h-full flex flex-col items-center justify-center gap-1 active:bg-gray-50 ${
                    ativo ? 'text-[#006653]' : 'text-gray-500'
                  }`}
                >
                  <span className={`flex items-center justify-center w-12 h-7 rounded-full ${ativo ? 'bg-emerald-50' : ''}`}>
                    <Icon className="w-5 h-5" strokeWidth={ativo ? 2.5 : 2} />
                  </span>
                  <span className={`text-[11px] ${ativo ? 'font-semibold' : 'font-medium'}`}>{label}</span>
                  {id === 'chamados' && totalChamados > 0 && (
                    <span className="absolute top-1.5 right-[calc(50%-22px)] min-w-[18px] h-[18px] px-1 rounded-full bg-[#006653] text-white text-[10px] font-semibold leading-[18px] text-center">
                      {totalChamados > 99 ? '99+' : totalChamados}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setMaisAberto(true)}
              className={`w-full h-full flex flex-col items-center justify-center gap-1 active:bg-gray-50 ${
                emOutra ? 'text-[#006653]' : 'text-gray-500'
              }`}
            >
              <span className={`flex items-center justify-center w-12 h-7 rounded-full ${emOutra ? 'bg-emerald-50' : ''}`}>
                <Menu className="w-5 h-5" />
              </span>
              <span className={`text-[11px] ${emOutra ? 'font-semibold' : 'font-medium'}`}>Mais</span>
            </button>
          </li>
        </ul>
      </nav>

      <Dialog open={maisAberto} onOpenChange={setMaisAberto}>
        <DialogContent className="bg-white p-0 gap-0">
          <DialogHeader className="px-4 pb-2">
            <DialogTitle className="text-base text-left">Mais seções</DialogTitle>
          </DialogHeader>
          <ul className="divide-y divide-gray-100">
            {OUTRAS.map(({ id, label, icon: Icon }) => (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelecionar(id);
                    setMaisAberto(false);
                    window.scrollTo({ top: 0 });
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-4 text-left active:bg-gray-50 ${aba === id ? 'text-[#006653] font-semibold' : 'text-gray-900'}`}
                >
                  <Icon className="w-5 h-5 text-[#006653]" />
                  <span className="flex-1 text-[15px]">{label}</span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>
              </li>
            ))}
            <li>
              <Link href="/" className="w-full flex items-center gap-3 px-4 py-4 text-gray-700 active:bg-gray-50">
                <ArrowLeft className="w-5 h-5" />
                <span className="flex-1 text-[15px]">Voltar ao site</span>
              </Link>
            </li>
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
