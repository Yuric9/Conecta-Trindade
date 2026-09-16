'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Truck,
  Search,
  Calendar,
  Clock,
  MapPin,
  Recycle,
  Trash2,
  ShieldCheck,
  Info,
  Building2,
  ArrowRight,
  Filter,
  CheckCircle2,
  Sun,
  Sunset,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  CRONOGRAMA_OFICIAL_TRINDADE,
  ItemCronogramaRSU,
  getCronogramaPorBairro,
  getStatusColetaBairro,
  getBairrosHoje,
  getHorarioTurno,
  DIRETRIZES_DESCARTE_TRINDADE,
  DIAS_SEMANA_LABELS,
  TurnoColeta,
  RegiaoRSU,
} from '@/lib/rsu-schedule';

export default function CronogramaRSUPage() {
  const [selectedBairroNome, setSelectedBairroNome] = useState<string>('SETOR CENTRAL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'consulta' | 'hoje' | 'tabela' | 'dicas'>('consulta');
  const [filtroRegiao, setFiltroRegiao] = useState<string>('TODAS');
  const [filtroTurno, setFiltroTurno] = useState<string>('TODOS');
  const [filtroTabelaPesquisa, setFiltroTabelaPesquisa] = useState<string>('');

  // Item do cronograma do bairro selecionado
  const currentItem: ItemCronogramaRSU = useMemo(() => {
    const found = getCronogramaPorBairro(selectedBairroNome);
    return found || CRONOGRAMA_OFICIAL_TRINDADE[0];
  }, [selectedBairroNome]);

  // Status de coleta para o bairro
  const statusColeta = useMemo(() => {
    return getStatusColetaBairro(currentItem);
  }, [currentItem]);

  // Resumo do dia de hoje em Trindade
  const resumoHoje = useMemo(() => {
    return getBairrosHoje();
  }, []);

  // Lista para busca rápida na consulta
  const filteredBairrosBusca = useMemo(() => {
    if (!searchTerm.trim()) return CRONOGRAMA_OFICIAL_TRINDADE.slice(0, 15);
    const termo = searchTerm.toLowerCase();
    return CRONOGRAMA_OFICIAL_TRINDADE.filter(
      (b) =>
        b.bairro.toLowerCase().includes(termo) ||
        b.regiao.toLowerCase().includes(termo) ||
        b.frequenciaTexto.toLowerCase().includes(termo)
    );
  }, [searchTerm]);

  // Lista filtrada para a tabela geral
  const tabelaFiltrada = useMemo(() => {
    return CRONOGRAMA_OFICIAL_TRINDADE.filter((item) => {
      if (filtroRegiao !== 'TODAS' && item.regiao !== filtroRegiao) return false;
      if (filtroTurno !== 'TODOS' && item.turno !== filtroTurno) return false;
      if (filtroTabelaPesquisa.trim()) {
        const termo = filtroTabelaPesquisa.toLowerCase();
        return (
          item.bairro.toLowerCase().includes(termo) ||
          item.frequenciaTexto.toLowerCase().includes(termo) ||
          item.regiao.toLowerCase().includes(termo)
        );
      }
      return true;
    });
  }, [filtroRegiao, filtroTurno, filtroTabelaPesquisa]);

  const horarioInfo = getHorarioTurno(currentItem.turno);

  return (
    <div className="min-h-screen bg-[#f4f6f4] pb-20">
      {/* Hero Header */}
      <section className="bg-gradient-to-r from-[#006653] via-[#005847] to-[#004d3e] text-white py-12 px-4 shadow-md relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
          <Truck className="w-80 h-80 text-white" />
        </div>

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-900/60 border border-emerald-400/30 text-xs font-semibold text-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-[#FFC20E]" />
              <span>Secretaria Municipal de Serviços Públicos de Trindade</span>
            </div>
            <span className="text-xs text-emerald-200 font-medium flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full">
              <Calendar className="w-3.5 h-3.5" />
              <span>Hoje: {resumoHoje.diaSemanaLabel}</span>
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold font-heading text-white tracking-tight mb-2">
            Cronograma Oficial de Coleta de Lixo (RSU)
          </h1>
          <p className="text-emerald-100 text-sm sm:text-base max-w-2xl leading-relaxed">
            Consulte a frequência, dias e turnos oficiais da coleta de lixo orgânico em todos os{' '}
            <strong>117 bairros e setores</strong> do Município de Trindade - GO.
          </p>

          {/* Navegação de Abas */}
          <div className="flex items-center gap-2 mt-8 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: 'consulta' as const, label: 'Consulte seu Bairro', icon: Search },
              { id: 'hoje' as const, label: `Hoje em Trindade (${resumoHoje.totalHoje} setores)`, icon: Clock },
              { id: 'tabela' as const, label: `Tabela Completa (${CRONOGRAMA_OFICIAL_TRINDADE.length} Bairros)`, icon: Calendar },
              { id: 'dicas' as const, label: 'Descarte Consciente', icon: Recycle },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-[#FFC20E] text-[#173b32] shadow-sm scale-[1.02]'
                      : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-4 mt-8">
        {/* ABA 1: CONSULTA POR BAIRRO */}
        {activeTab === 'consulta' && (
          <div className="space-y-6">
            <Card className="border-gray-200 shadow-sm bg-white overflow-hidden">
              <div className="p-5 sm:p-6 border-b border-gray-100 bg-gradient-to-r from-emerald-50/60 to-white">
                <div className="max-w-2xl">
                  <label
                    htmlFor="bairro-search-input"
                    className="block text-xs uppercase font-bold tracking-wider text-[#006653] mb-2 flex items-center gap-1.5"
                  >
                    <MapPin className="w-4 h-4 text-[#006653]" />
                    Localize o seu bairro ou setor em Trindade
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <Input
                      id="bairro-search-input"
                      type="text"
                      placeholder="Digite o nome do bairro (Ex: Maysa, Garavelo, Centro, Laguna Park...)"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 h-11 text-sm bg-white border-gray-300 focus:border-[#006653] shadow-xs"
                    />
                  </div>

                  {/* Atalhos rápidos */}
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-gray-500 mr-1">Acesso rápido:</span>
                    {[
                      'SETOR CENTRAL',
                      'MAYSA',
                      'SETOR SUL',
                      'GARAVELO I,II',
                      'SETOR LAGUNA PARK',
                      'SETOR PONTAKAYANA',
                      'JARDIM SALVADOR',
                      'VILA PAI ENERTO',
                    ].map((b) => (
                      <button
                        key={b}
                        onClick={() => {
                          setSelectedBairroNome(b);
                          setSearchTerm('');
                        }}
                        className={`text-xs px-2.5 py-1 rounded-md transition-all ${
                          selectedBairroNome === b
                            ? 'bg-[#006653] text-white font-semibold'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>

                  {searchTerm.trim() && (
                    <div className="mt-3 max-h-56 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100 bg-white shadow-md">
                      {filteredBairrosBusca.length === 0 ? (
                        <p className="p-3 text-xs text-gray-500 text-center">
                          Nenhum setor encontrado com esse termo.
                        </p>
                      ) : (
                        filteredBairrosBusca.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => {
                              setSelectedBairroNome(item.bairro);
                              setSearchTerm('');
                            }}
                            className="w-full text-left px-3.5 py-2.5 text-xs hover:bg-emerald-50 flex items-center justify-between group transition-colors"
                          >
                            <span className="font-medium text-gray-800 group-hover:text-[#006653]">
                              {item.bairro}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                                {item.turno}
                              </span>
                              <span className="text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded font-semibold">
                                {item.regiao}
                              </span>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Resultado detalhado do Bairro Selecionado */}
              <div className="p-5 sm:p-7">
                <div className="flex flex-wrap items-start justify-between gap-4 pb-6 border-b border-gray-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl sm:text-2xl font-bold font-heading text-gray-900">
                        {currentItem.bairro}
                      </h2>
                      <Badge className="bg-emerald-100 text-[#006653] border-emerald-200 text-xs">
                        Região {currentItem.regiao}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-gray-400" />
                      <span>Trindade - GO</span>
                      <span className="text-gray-300">·</span>
                      <span>Secretaria Municipal de Serviços Públicos</span>
                    </p>
                  </div>

                  {/* Status Hoje */}
                  <div className="flex items-center">
                    {statusColeta.temColetaHoje ? (
                      <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-right flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                        <div>
                          <span className="block text-xs font-bold text-emerald-800 uppercase tracking-wide">
                            🟢 Coleta HOJE no seu bairro!
                          </span>
                          <span className="text-xs text-emerald-600 font-medium">
                            Turno {currentItem.turno} ({horarioInfo.faixa})
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5 text-right flex items-center gap-2.5">
                        <Clock className="w-4 h-4 text-amber-600" />
                        <div>
                          <span className="block text-xs font-bold text-amber-800 uppercase tracking-wide">
                            🟡 Hoje não há coleta neste bairro
                          </span>
                          <span className="text-xs text-amber-700 font-medium">
                            Próxima passagem: {statusColeta.proximaColeta.diaSemanaExtenso} ({statusColeta.proximaColeta.dataEstimada})
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Grid com dados oficiais do Bairro */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-6">
                  {/* Card Frequência */}
                  <div className="rounded-xl border border-gray-200 p-4 bg-gray-50/50 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-[#006653] text-white flex items-center justify-center">
                          <Trash2 className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-sm text-gray-900">Frequência da Coleta</span>
                      </div>
                      <p className="text-base font-extrabold text-[#006653] mt-2">
                        {currentItem.frequenciaTexto}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Dias programados para o caminhão compactador passar.
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-gray-200/70 text-[11px] text-gray-500">
                      Dias: {currentItem.diasSemana.map((d) => DIAS_SEMANA_LABELS[d].curto).join(', ')}
                    </div>
                  </div>

                  {/* Card Turno e Horário */}
                  <div className="rounded-xl border border-blue-200 p-4 bg-blue-50/30 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                          {currentItem.turno === 'MATUTINO' ? (
                            <Sun className="w-4 h-4" />
                          ) : (
                            <Sunset className="w-4 h-4" />
                          )}
                        </div>
                        <span className="font-bold text-sm text-gray-900">Turno Oficial</span>
                      </div>
                      <p className="text-base font-extrabold text-blue-900 mt-2">
                        {currentItem.turno} ({horarioInfo.faixa})
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        Início da rota estimado a partir das <strong>{horarioInfo.inicio}</strong>.
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-blue-200/60 text-[11px] text-blue-800 font-medium">
                      💡 {horarioInfo.instrucao}
                    </div>
                  </div>

                  {/* Card Setor / Região */}
                  <div className="rounded-xl border border-emerald-200 p-4 bg-emerald-50/30 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-sm text-gray-900">Região de Trindade</span>
                      </div>
                      <p className="text-base font-extrabold text-emerald-950 mt-2">
                        {currentItem.regiao === 'CENTRO' ? 'Região Centro / Sede' : 'Região Leste / Trindade II'}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        Atendido pela base operacional e caminhões compactadores da Secretaria de Serviços Públicos.
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-emerald-200/60 text-[11px] text-emerald-800 font-medium">
                      📍 Cadastro oficial da planilha municipal de RSU
                    </div>
                  </div>
                </div>

                {/* Banner para abrir O.S. se o caminhão não passar */}
                <div className="mt-7 rounded-xl bg-emerald-50/80 border border-emerald-200 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-[#006653] flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-emerald-950">
                        O caminhão não passou no seu bairro ou há lixo acumulado na rua?
                      </h4>
                      <p className="text-xs text-emerald-800 mt-0.5">
                        Abra uma Ordem de Serviço pelo Conecta Trindade para que a equipe de fiscalização e limpeza seja notificada.
                      </p>
                    </div>
                  </div>
                  <Link href="/nova-solicitacao">
                    <Button
                      size="sm"
                      className="bg-[#006653] hover:bg-[#005242] text-white text-xs font-semibold whitespace-nowrap shadow-xs h-9 px-4 gap-1.5"
                    >
                      <span>Abrir Chamado de Lixo</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ABA 2: HOJE EM TRINDADE */}
        {activeTab === 'hoje' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-[#006653] uppercase tracking-wider">
                  Operação Diária de RSU
                </span>
                <h2 className="text-xl font-bold font-heading text-gray-900 mt-0.5">
                  Bairros com Coleta Hoje ({resumoHoje.diaSemanaLabel})
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-3 py-1.5 rounded-lg bg-emerald-50 text-[#006653] font-semibold border border-emerald-200">
                  {resumoHoje.matutino.length} Setores Matutino
                </span>
                <span className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-800 font-semibold border border-blue-200">
                  {resumoHoje.vespertino.length} Setores Vespertino
                </span>
              </div>
            </div>

            {/* Turno Matutino */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <Sun className="w-4 h-4 text-amber-600" />
                <span>Turno Matutino (Manhã - A partir das 07h)</span>
                <Badge className="bg-amber-100 text-amber-800 border-0 text-[10px]">
                  {resumoHoje.matutino.length} bairros
                </Badge>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {resumoHoje.matutino.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedBairroNome(item.bairro);
                      setActiveTab('consulta');
                    }}
                    className="p-3.5 bg-white rounded-xl border border-gray-200 shadow-xs hover:border-emerald-300 hover:shadow-sm cursor-pointer transition-all flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-gray-900">{item.bairro}</p>
                      <span className="text-[11px] text-gray-500">{item.frequenciaTexto}</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] text-emerald-700 bg-emerald-50">
                      {item.regiao}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Turno Vespertino */}
            <div className="space-y-3 pt-4">
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <Sunset className="w-4 h-4 text-blue-600" />
                <span>Turno Vespertino (Tarde/Noite - A partir das 16h)</span>
                <Badge className="bg-blue-100 text-blue-800 border-0 text-[10px]">
                  {resumoHoje.vespertino.length} bairros
                </Badge>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {resumoHoje.vespertino.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedBairroNome(item.bairro);
                      setActiveTab('consulta');
                    }}
                    className="p-3.5 bg-white rounded-xl border border-gray-200 shadow-xs hover:border-blue-300 hover:shadow-sm cursor-pointer transition-all flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-gray-900">{item.bairro}</p>
                      <span className="text-[11px] text-gray-500">{item.frequenciaTexto}</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] text-blue-700 bg-blue-50">
                      {item.regiao}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ABA 3: TABELA COMPLETA DOS 117 BAIRROS DA PLANILHA OFICIAL */}
        {activeTab === 'tabela' && (
          <div className="space-y-6">
            {/* Controles e Filtros */}
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative w-64">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <Input
                    type="text"
                    placeholder="Filtrar bairro..."
                    value={filtroTabelaPesquisa}
                    onChange={(e) => setFiltroTabelaPesquisa(e.target.value)}
                    className="pl-8 h-9 text-xs bg-white border-gray-300"
                  />
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-semibold text-gray-500 ml-1">Região:</span>
                  {['TODAS', 'CENTRO', 'LESTE'].map((r) => (
                    <button
                      key={r}
                      onClick={() => setFiltroRegiao(r)}
                      className={`text-xs px-2.5 py-1 rounded-md transition-all ${
                        filtroRegiao === r
                          ? 'bg-[#006653] text-white font-semibold'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1 ml-1">
                  <span className="text-[11px] font-semibold text-gray-500">Turno:</span>
                  {['TODOS', 'MATUTINO', 'VESPERTINO'].map((t) => (
                    <button
                      key={t}
                      onClick={() => setFiltroTurno(t)}
                      className={`text-xs px-2.5 py-1 rounded-md transition-all ${
                        filtroTurno === t
                          ? 'bg-blue-700 text-white font-semibold'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <span className="text-xs text-gray-500 font-medium">
                Exibindo {tabelaFiltrada.length} de {CRONOGRAMA_OFICIAL_TRINDADE.length} bairros
              </span>
            </div>

            {/* Tabela dos 117 Bairros */}
            <Card className="border-gray-200 shadow-sm bg-white overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-600 border-b border-gray-200 uppercase font-semibold text-[11px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">#</th>
                      <th className="py-3 px-4">Bairro / Setor</th>
                      <th className="py-3 px-4">Frequência de Coleta</th>
                      <th className="py-3 px-4">Turno</th>
                      <th className="py-3 px-4">Região</th>
                      <th className="py-3 px-4 text-center">Dias da Semana</th>
                      <th className="py-3 px-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {tabelaFiltrada.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-3 px-4 text-gray-400 font-mono text-[11px]">{idx + 1}</td>
                        <td className="py-3 px-4 font-bold text-gray-900">{item.bairro}</td>
                        <td className="py-3 px-4 text-gray-700 font-medium">{item.frequenciaTexto}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              item.turno === 'MATUTINO'
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-blue-100 text-blue-900'
                            }`}
                          >
                            {item.turno}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="text-[10px] font-medium">
                            {item.regiao}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-center text-gray-600 text-[11px]">
                          {item.diasSemana.map((d) => DIAS_SEMANA_LABELS[d].curto).join(', ')}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedBairroNome(item.bairro);
                              setActiveTab('consulta');
                            }}
                            className="text-[#006653] hover:underline font-semibold text-[11px]"
                          >
                            Ver detalhes →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* ABA 4: DICAS E DESCARTE CONSCIENTE */}
        {activeTab === 'dicas' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {DIRETRIZES_DESCARTE_TRINDADE.map((dica, index) => (
                <Card key={index} className="border-gray-200 shadow-sm bg-white p-5">
                  <div className="flex items-start gap-3.5">
                    <span className="text-3xl p-2 rounded-xl bg-emerald-50 border border-emerald-100 flex-shrink-0">
                      {dica.icone}
                    </span>
                    <div>
                      <h4 className="font-bold text-sm text-gray-900 mb-1">{dica.titulo}</h4>
                      <p className="text-xs text-gray-600 leading-relaxed">{dica.descricao}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Alerta importante */}
            <Card className="border-amber-200 bg-amber-50/70 p-5 shadow-xs">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-amber-900">
                    O que NÃO colocar no lixo domiciliar comum?
                  </h4>
                  <ul className="mt-2 space-y-1 text-xs text-amber-800 list-disc list-inside">
                    <li>Pilhas, baterias e eletrônicos (devem ser devolvidos via logística reversa em pontos comerciais).</li>
                    <li>Medicamentos vencidos (entregar nas farmácias das UBSs de Trindade).</li>
                    <li>Restos de tintas, óleos usados ou solventes químicos corrosivos.</li>
                    <li>Grandes volumes de entulho de construção (devem utilizar caçambas particulares credenciadas).</li>
                  </ul>
                </div>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
