'use client';

import Link from 'next/link';
import { Lightbulb, Construction, Trash2, Droplet, MapPin, FileText, CheckCircle2, Clock, ArrowRight, Shield, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';

export default function HomePage() {
  const { profile } = useAuth();

  return (
    <div className="bg-[#F4F6F8]">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-[#0A3A7A] via-[#1E5BC6] to-[#0A3A7A] text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-300 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 py-16 md:py-24">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="animate-fade-in">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-sm text-xs font-semibold mb-4">
                <Shield className="w-3.5 h-3.5" />
                Plataforma Oficial da Prefeitura de Trindade
              </span>
              <h1 className="text-3xl md:text-5xl font-bold font-heading leading-tight mb-4">
                Conecta Trindade
                <span className="block text-blue-200 text-xl md:text-2xl font-medium mt-2">
                  Zelo Urbano
                </span>
              </h1>
              <p className="text-blue-100 text-base md:text-lg leading-relaxed mb-8 max-w-lg">
                Registre e acompanhe solicitações de serviços públicos. Iluminação, buracos,
                limpeza, vazamentos e mais — na palma da sua mão.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                {profile ? (
                  <Link href="/nova-solicitacao">
                    <Button size="lg" className="bg-white text-[#0A3A7A] hover:bg-blue-50 font-semibold text-base h-12 px-8">
                      <FileText className="w-5 h-5 mr-2" />
                      Nova Solicitação
                    </Button>
                  </Link>
                ) : (
                  <Link href="/login">
                    <Button size="lg" className="bg-white text-[#0A3A7A] hover:bg-blue-50 font-semibold text-base h-12 px-8">
                      Entrar / Cadastrar
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </Link>
                )}
                {profile && (
                  <Link href="/meus-chamados">
                    <Button size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10 h-12 px-8 text-base">
                      Meus Chamados
                    </Button>
                  </Link>
                )}
              </div>
            </div>
            <div className="hidden md:flex justify-center animate-fade-in">
              <div className="relative">
                <div className="w-80 h-80 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center">
                  <div className="grid grid-cols-2 gap-4 p-8">
                    {[
                      { icon: Lightbulb, label: 'Iluminação', color: 'text-yellow-300' },
                      { icon: Construction, label: 'Buracos', color: 'text-orange-300' },
                      { icon: Trash2, label: 'Limpeza', color: 'text-green-300' },
                      { icon: Droplet, label: 'Vazamento', color: 'text-blue-300' },
                    ].map((item, i) => {
                      const Icon = item.icon;
                      return (
                        <div
                          key={i}
                          className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/10 hover:bg-white/20 transition-all cursor-pointer"
                          style={{ animationDelay: `${i * 0.1}s` }}
                        >
                          <Icon className={`w-10 h-10 ${item.color}`} />
                          <span className="text-xs font-medium text-white">{item.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold font-heading text-[#0A3A7A] mb-3">
            Como Funciona
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Três passos simples para contribuir com o zelo urbano de Trindade
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: FileText, step: '1', title: 'Registre o Problema', desc: 'Tire uma foto, escolha a categoria e marque a localização no mapa' },
            { icon: Zap, step: '2', title: 'Prefeitura Recebe', desc: 'Sua solicitação é encaminhada automaticamente à secretaria responsável' },
            { icon: CheckCircle2, step: '3', title: 'Acompanhe', desc: 'Receba um número de protocolo e acompanhe o andamento em tempo real' },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-4 relative">
                  <Icon className="w-7 h-7 text-[#1E5BC6]" />
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#1E5BC6] text-white text-xs font-bold flex items-center justify-center">
                    {item.step}
                  </span>
                </div>
                <h3 className="font-semibold text-lg text-[#0A3A7A] mb-2 font-heading">{item.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Categories */}
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold font-heading text-[#0A3A7A] mb-3">
              Categorias de Atendimento
            </h2>
            <p className="text-gray-600">Selecione o tipo de serviço que você precisa</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { icon: Lightbulb, label: 'Iluminação', emoji: '💡', color: 'bg-amber-50 text-amber-600', border: 'border-amber-200' },
              { icon: Construction, label: 'Buraco', emoji: '🕳️', color: 'bg-orange-50 text-orange-600', border: 'border-orange-200' },
              { icon: Trash2, label: 'Limpeza', emoji: '🗑️', color: 'bg-green-50 text-green-600', border: 'border-green-200' },
              { icon: Droplet, label: 'Vazamento', emoji: '💧', color: 'bg-blue-50 text-blue-600', border: 'border-blue-200' },
              { icon: MapPin, label: 'Podas', emoji: '🌳', color: 'bg-emerald-50 text-emerald-600', border: 'border-emerald-200' },
              { icon: Clock, label: 'Outros', emoji: '⚠️', color: 'bg-gray-50 text-gray-600', border: 'border-gray-200' },
            ].map((cat, i) => {
              const Icon = cat.icon;
              return (
                <div
                  key={i}
                  className={`flex flex-col items-center gap-3 p-6 rounded-xl border-2 ${cat.border} ${cat.color} hover:scale-105 transition-transform cursor-pointer`}
                >
                  <div className="text-3xl">{cat.emoji}</div>
                  <Icon className="w-6 h-6" />
                  <span className="text-sm font-semibold">{cat.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="bg-gradient-to-r from-[#0A3A7A] to-[#1E5BC6] rounded-2xl p-8 md:p-12 text-center text-white shadow-xl">
          <h2 className="text-2xl md:text-3xl font-bold font-heading mb-4">
            Pronto para contribuir com Trindade?
          </h2>
          <p className="text-blue-100 mb-8 max-w-xl mx-auto">
            Cadastre-se agora e comece a registrar solicitações de zelo urbano em sua comunidade.
          </p>
          {profile ? (
            <Link href="/nova-solicitacao">
              <Button size="lg" className="bg-white text-[#0A3A7A] hover:bg-blue-50 font-semibold text-base h-12 px-8">
                <FileText className="w-5 h-5 mr-2" />
                Nova Solicitação
              </Button>
            </Link>
          ) : (
            <Link href="/login">
              <Button size="lg" className="bg-white text-[#0A3A7A] hover:bg-blue-50 font-semibold text-base h-12 px-8">
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
