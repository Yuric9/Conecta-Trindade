'use client';

import Link from 'next/link';
import { Lightbulb, Construction, Trash2, Droplet, MapPin, FileText, CheckCircle2, Clock, ArrowRight, Shield, Zap, Truck, Calendar, Search, Scissors, TreePine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';

export default function HomePage() {
  const { profile } = useAuth();

  return (
    <div className="bg-[#eef1ef]">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-[#006653] via-[#00745e] to-[#004d3e] text-white overflow-hidden min-h-[520px]">
        <div className="municipal-wave" />
        <div className="absolute inset-0 opacity-15">
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 py-16 md:py-24">
          <div className="grid md:grid-cols-[1.2fr_0.8fr] gap-8 items-center">
            <div className="animate-fade-in">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-semibold mb-5 tracking-[0.12em] uppercase text-emerald-50">
                <Shield className="w-3.5 h-3.5 text-[#FFC20E]" />
                Plataforma oficial
              </span>
              <h1 className="text-3xl md:text-5xl font-black font-heading leading-tight mb-4 tracking-tight">
                Conecta Trindade
                <span className="block text-[#FFC20E] text-xl md:text-2xl font-semibold mt-2">
                  Zelo Urbano
                </span>
              </h1>
              <p className="text-emerald-50 text-base md:text-lg leading-relaxed mb-8 max-w-xl">
                Registre e acompanhe solicitações de serviços públicos em Trindade. Iluminação,
                buracos, limpeza, vazamentos e muito mais em um só lugar.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/solicitar">
                  <Button size="lg" className="bg-[#FFC20E] text-[#173b32] hover:bg-yellow-300 font-semibold text-base h-12 px-7 shadow-lg shadow-emerald-950/20">
                    <FileText className="w-5 h-5 mr-2" />
                    Nova Solicitação
                  </Button>
                </Link>
                <Link href="/acompanhar">
                  <Button size="lg" variant="outline" className="border-white/35 text-white hover:bg-white/10 h-12 px-6 text-base backdrop-blur-sm gap-2">
                    <Search className="w-4 h-4 text-emerald-200" />
                    Acompanhar Demanda
                  </Button>
                </Link>
                {profile && (
                  <Link href="/meus-chamados">
                    <Button size="lg" variant="outline" className="border-white/35 text-white hover:bg-white/10 h-12 px-6 text-base backdrop-blur-sm">
                      Meus Chamados
                    </Button>
                  </Link>
                )}
              </div>
            </div>
            <div className="hidden md:flex justify-center animate-fade-in">
              <div className="relative w-full max-w-md">
                <div className="rounded-[28px] bg-[#004d3e]/95 border border-white/30 shadow-2xl p-5">
                  <div className="bg-[#003f33] rounded-2xl p-5 border border-[#FFC20E]/70 shadow-lg">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[#FFC20E] font-bold mb-4">Áreas de atendimento</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {[
                        { icon: Lightbulb, label: 'Iluminação', color: 'text-[#FFC20E]' },
                        { icon: Construction, label: 'Buracos', color: 'text-orange-300' },
                        { icon: Trash2, label: 'Limpeza', color: 'text-emerald-300' },
                        { icon: Scissors, label: 'Roçagem', color: 'text-lime-300' },
                        { icon: TreePine, label: 'Podas', color: 'text-emerald-400' },
                        { icon: Droplet, label: 'Vazamento', color: 'text-sky-300' },
                      ].map((item, i) => {
                        const Icon = item.icon;
                        return (
                          <div key={i} className="rounded-xl bg-[#005847] p-3 border border-white/20 text-center shadow-sm">
                            <Icon className={`w-6 h-6 mx-auto ${item.color}`} strokeWidth={2.5} />
                            <span className="block mt-1.5 text-xs font-bold text-white">{item.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="mt-4 bg-[#005847] rounded-2xl border border-white/25 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs uppercase tracking-[0.2em] text-white/90 font-semibold">Status</span>
                      <span className="text-sm font-bold text-[#FFC20E]">Ativo</span>
                    </div>
                    <p className="mt-3 text-2xl font-black text-white">24h</p>
                    <p className="text-sm text-white/90 font-medium">tempo médio de atendimento</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Metrics and trust bar */}
      <section className="max-w-7xl mx-auto px-4 -mt-8 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { value: '24h', label: 'tempo médio de resposta' },
            { value: '7', label: 'categorias atendidas' },
            { value: '3 passos', label: 'para abrir o chamado' },
            { value: '100%', label: 'onboarding digital' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 text-center">
              <p className="text-2xl font-bold text-[#006653] font-heading">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* RSU Waste Collection Schedule Section */}
      <section className="max-w-7xl mx-auto px-4 mt-8">
        <div className="bg-gradient-to-r from-white via-emerald-50/40 to-white rounded-2xl border border-emerald-200/80 shadow-sm p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#006653] text-white flex items-center justify-center flex-shrink-0 shadow-md">
              <Truck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-bold text-[#006653] uppercase tracking-wider bg-emerald-100/70 px-2.5 py-0.5 rounded-full">
                  Serviço Municipal
                </span>
                <span className="text-xs text-gray-500 font-medium flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  Atualizado 2026
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-bold font-heading text-gray-900">
                Cronograma de Coleta de Lixo RSU
              </h2>
              <p className="text-sm text-gray-600 mt-1 max-w-xl leading-relaxed">
                Descubra em segundos os dias e turnos (diurno ou noturno) em que a coleta domiciliar e seletiva passa na sua rua em Trindade.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto flex-shrink-0">
            <Link href="/cronograma-rsu" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto bg-[#006653] hover:bg-[#005242] text-white font-semibold text-sm h-11 px-6 shadow-sm gap-2">
                <Clock className="w-4 h-4" />
                <span>Consultar Meu Bairro</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold font-heading text-[#006653] mb-3">
            Como Funciona
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Três passos simples para contribuir com o zelo urbano de Trindade
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: FileText, step: '1', title: 'Registre o Problema', desc: 'Tire uma foto, escolha a categoria e marque a localização no mapa', href: '/solicitar' },
            { icon: Zap, step: '2', title: 'Prefeitura Recebe', desc: 'Sua solicitação é encaminhada automaticamente à secretaria responsável', href: '/cronograma-rsu' },
            { icon: CheckCircle2, step: '3', title: 'Acompanhe', desc: 'Receba um número de protocolo e acompanhe o andamento em tempo real', href: '/acompanhar' },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <Link key={i} href={item.href} className="group block">
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 group-hover:border-emerald-300 group-hover:shadow-md transition-all group-hover:-translate-y-1 h-full">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4 relative group-hover:bg-emerald-100 transition-colors">
                    <Icon className="w-7 h-7 text-[#006653]" />
                    <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#FFC20E] text-[#173b32] text-xs font-bold flex items-center justify-center">
                      {item.step}
                    </span>
                  </div>
                  <h3 className="font-semibold text-lg text-[#006653] mb-2 font-heading group-hover:text-[#004d3e] flex items-center justify-between">
                    <span>{item.title}</span>
                    <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-emerald-600" />
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Categories */}
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold font-heading text-[#006653] mb-3">
              Categorias de Atendimento
            </h2>
            <p className="text-gray-600">Selecione o tipo de serviço que você precisa</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3.5">
            {[
              { icon: Lightbulb, label: 'Iluminação', emoji: '💡', cat: 'Iluminação Pública', color: 'bg-amber-50 text-amber-700 hover:border-amber-400', border: 'border-amber-200' },
              { icon: Construction, label: 'Tapa-Buraco', emoji: '🕳️', cat: 'Buracos e Pavimentação', color: 'bg-orange-50 text-orange-700 hover:border-orange-400', border: 'border-orange-200' },
              { icon: Trash2, label: 'Limpeza Urbana', emoji: '🗑️', cat: 'Limpeza e Entulho', color: 'bg-emerald-50 text-emerald-700 hover:border-emerald-400', border: 'border-emerald-200' },
              { icon: Scissors, label: 'Roçagem e Capina', emoji: '🌾', cat: 'Roçagem e Capina', color: 'bg-lime-50 text-lime-800 hover:border-lime-400', border: 'border-lime-300' },
              { icon: TreePine, label: 'Poda de Árvores', emoji: '🌳', cat: 'Poda e Arborização', color: 'bg-green-50 text-green-700 hover:border-green-400', border: 'border-green-200' },
              { icon: Droplet, label: 'Vazamento de Água', emoji: '💧', cat: 'Vazamento de Água', color: 'bg-sky-50 text-sky-700 hover:border-sky-400', border: 'border-sky-200' },
              { icon: Clock, label: 'Outros Serviços', emoji: '⚠️', cat: 'Outros Serviços', color: 'bg-purple-50 text-purple-700 hover:border-purple-400', border: 'border-purple-200' },
            ].map((cat, i) => {
              const Icon = cat.icon;
              return (
                <Link
                  key={i}
                  href={`/solicitar?categoria=${encodeURIComponent(cat.cat)}`}
                  className={`flex flex-col items-center justify-center gap-2.5 p-4 rounded-xl border-2 ${cat.border} ${cat.color} hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer text-center bg-white group`}
                >
                  <div className="text-3xl group-hover:scale-110 transition-transform">{cat.emoji}</div>
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-bold leading-tight line-clamp-2">{cat.label}</span>
                  <span className="text-[10px] text-gray-400 group-hover:text-emerald-700 font-semibold transition-colors">
                    Solicitar →
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="bg-gradient-to-r from-[#006653] to-[#004d3e] rounded-2xl p-8 md:p-12 text-center text-white shadow-xl">
          <h2 className="text-2xl md:text-3xl font-bold font-heading mb-4">
            Pronto para contribuir com Trindade?
          </h2>
          <p className="text-emerald-50 mb-8 max-w-xl mx-auto">
            Cadastre-se agora e comece a registrar solicitações de zelo urbano em sua comunidade.
          </p>
          {profile ? (
            <Link href="/nova-solicitacao">
              <Button size="lg" className="bg-[#FFC20E] text-[#173b32] hover:bg-yellow-300 font-semibold text-base h-12 px-8">
                <FileText className="w-5 h-5 mr-2" />
                Nova Solicitação
              </Button>
            </Link>
          ) : (
            <Link href="/login">
              <Button size="lg" className="bg-[#FFC20E] text-[#173b32] hover:bg-yellow-300 font-semibold text-base h-12 px-8">
                Entrar / Cadastrar
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
