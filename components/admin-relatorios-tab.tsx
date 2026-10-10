'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  PERIODOS,
  periodoPadrao,
  periodoPersonalizado,
  carregarDadosRelatorio,
  calcularRelatorio,
  formatarDias,
  type IdPeriodo,
  type Periodo,
  type LinhaRelatorio,
  type LinhaGrupo,
  type Relatorio,
} from '@/lib/relatorio-os';
import { AreaImpressao } from '@/components/ficha-os';
import { Button } from '@/components/ui/button';
import { BarChart3, Loader2, Printer, RefreshCw } from 'lucide-react';

interface Props {
  /** Nome do coordenador pelo id (a página já tem a equipe carregada) */
  nomeCoordenador: (id: string) => string;
  /** Modo demonstração: as O.S. que o painel já mostra */
  chamadosDemo?: any[];
}

const pct = (parte: number, todo: number) => (todo ? Math.round((parte / todo) * 100) : 0);

/** Relatórios para a gestão: números do período, por serviço, mês, rua e coordenador. */
export default function AdminRelatoriosTab({ nomeCoordenador, chamadosDemo }: Props) {
  const [idPeriodo, setIdPeriodo] = useState<IdPeriodo | 'personalizado'>('este_mes');
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');
  const [linhas, setLinhas] = useState<LinhaRelatorio[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [imprimindo, setImprimindo] = useState(0);

  const periodo: Periodo | null = useMemo(
    () => (idPeriodo === 'personalizado' ? periodoPersonalizado(de, ate) : periodoPadrao(idPeriodo)),
    [idPeriodo, de, ate]
  );

  const carregar = useCallback(async () => {
    if (!periodo) return;
    setCarregando(true);
    setErro(null);
    try {
      setLinhas(await carregarDadosRelatorio(periodo, chamadosDemo));
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível carregar o relatório.');
    } finally {
      setCarregando(false);
    }
  }, [periodo, chamadosDemo]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const relatorio = useMemo(() => calcularRelatorio(linhas, nomeCoordenador), [linhas, nomeCoordenador]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#006653]" />
            Relatórios
          </h2>
          <p className="text-sm text-gray-600">Pedidos abertos no período: {periodo ? periodo.rotulo : '—'}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={carregar} disabled={carregando || !periodo} className="h-9 text-xs gap-1.5">
            <RefreshCw className={`w-4 h-4 ${carregando ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button
            onClick={() => setImprimindo(Date.now())}
            disabled={carregando || !periodo || linhas.length === 0}
            className="h-9 text-xs gap-1.5 bg-[#006653] hover:bg-[#005242] text-white"
          >
            <Printer className="w-4 h-4" />
            Imprimir / PDF
          </Button>
        </div>
      </div>

      {/* Período */}
      <div className="flex flex-wrap items-center gap-2">
        {PERIODOS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setIdPeriodo(p.id)}
            aria-pressed={idPeriodo === p.id}
            className={`rounded-full px-3.5 h-9 text-sm font-medium border ${
              idPeriodo === p.id ? 'bg-[#006653] text-white border-[#006653]' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {p.rotulo}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setIdPeriodo('personalizado')}
          aria-pressed={idPeriodo === 'personalizado'}
          className={`rounded-full px-3.5 h-9 text-sm font-medium border ${
            idPeriodo === 'personalizado' ? 'bg-[#006653] text-white border-[#006653]' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          Escolher datas
        </button>
        {idPeriodo === 'personalizado' && (
          <span className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
            <label className="flex items-center gap-1">
              de
              <input type="date" value={de} onChange={(e) => setDe(e.target.value)} className="h-9 rounded-md border border-gray-300 px-2 text-sm" />
            </label>
            <label className="flex items-center gap-1">
              até
              <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} className="h-9 rounded-md border border-gray-300 px-2 text-sm" />
            </label>
            {!periodo && <span className="text-xs text-gray-500">Escolha as duas datas.</span>}
          </span>
        )}
      </div>

      {erro && <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2.5 text-sm text-red-900">{erro}</div>}

      {carregando ? (
        <div className="py-16 flex justify-center">
          <Loader2 className="w-7 h-7 text-[#006653] animate-spin" />
        </div>
      ) : linhas.length === 0 ? (
        <p className="py-12 text-center text-sm text-gray-500 bg-white rounded-xl border border-gray-200">
          Nenhum pedido aberto neste período.
        </p>
      ) : (
        <ConteudoRelatorio relatorio={relatorio} />
      )}

      {imprimindo > 0 && periodo && (
        <AreaImpressao key={imprimindo} onFim={() => setImprimindo(0)}>
          <FolhaRelatorio relatorio={relatorio} periodo={periodo} />
        </AreaImpressao>
      )}
    </div>
  );
}

/** Frase-resumo para quem vai ler o relatório (ex.: o prefeito) */
function frasePrincipal({ resumo: r }: Relatorio): string {
  const partes = [
    `A Prefeitura recebeu ${r.recebidos} ${r.recebidos === 1 ? 'pedido' : 'pedidos'}`,
    `${r.concluidos} ${r.concluidos === 1 ? 'foi concluído' : 'foram concluídos'} (${pct(r.concluidos, r.recebidos)}%)`,
  ];
  if (r.noPrazoPct !== null) partes.push(`${r.noPrazoPct}% dentro do prazo`);
  if (r.tempoMedioDias !== null) partes.push(`tempo médio de atendimento de ${formatarDias(r.tempoMedioDias)}`);
  return partes.join(', ') + '.';
}

function ConteudoRelatorio({ relatorio, impressao = false }: { relatorio: Relatorio; impressao?: boolean }) {
  const r = relatorio.resumo;
  return (
    <div className={impressao ? 'space-y-4' : 'space-y-5'}>
      <p className={`rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-950 ${impressao ? 'text-[12px]' : 'text-sm'}`}>
        {frasePrincipal(relatorio)}
      </p>

      <div className={`grid gap-2 ${impressao ? 'grid-cols-3' : 'grid-cols-2 md:grid-cols-3 xl:grid-cols-6'}`}>
        <Numero rotulo="Pedidos recebidos" valor={r.recebidos} />
        <Numero rotulo="Concluídos" valor={r.concluidos} detalhe={`${pct(r.concluidos, r.recebidos)}% dos recebidos`} />
        <Numero
          rotulo="Em aberto"
          valor={r.emAberto}
          detalhe={r.atrasadosAgora ? `${r.atrasadosAgora} com prazo vencido` : 'nenhum atrasado'}
          alerta={r.atrasadosAgora > 0}
        />
        <Numero rotulo="Dentro do prazo" valor={r.noPrazoPct === null ? '—' : `${r.noPrazoPct}%`} detalhe="das concluídas" />
        <Numero rotulo="Tempo médio" valor={formatarDias(r.tempoMedioDias)} detalhe="da abertura à conclusão" />
        <Numero
          rotulo="Cancelados"
          valor={r.cancelados}
          detalhe={r.cobradosPeloCidadao ? `${r.cobradosPeloCidadao} cobrados pelo cidadão` : undefined}
        />
      </div>

      <div className={`grid gap-4 ${impressao ? '' : 'lg:grid-cols-2'}`}>
        <Secao titulo="Por mês" ajuda="Pedidos recebidos em cada mês (e quantos já foram concluídos)">
          <Barras
            grupos={relatorio.porMes}
            texto={(g) => `${g.recebidos} recebidos · ${g.concluidos} concluídos`}
          />
        </Secao>

        <Secao titulo="Ruas com mais pedidos" ajuda="Lugares com 2 pedidos ou mais: podem ser problemas que se repetem">
          {relatorio.porRua.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhuma rua com mais de um pedido no período.</p>
          ) : (
            <Barras grupos={relatorio.porRua} texto={(g) => `${g.recebidos} pedidos · ${g.emAberto} em aberto`} />
          )}
        </Secao>
      </div>

      <Secao titulo="Por serviço" ajuda="Tempo médio: da abertura à conclusão">
        <Tabela
          colunas={['Serviço', 'Recebidos', 'Concluídos', 'Em aberto', 'No prazo', 'Tempo médio']}
          linhas={relatorio.porServico.map((g) => [
            g.rotulo,
            String(g.recebidos),
            String(g.concluidos),
            String(g.emAberto),
            g.noPrazoPct === null ? '—' : `${g.noPrazoPct}%`,
            formatarDias(g.tempoMedioDias),
          ])}
        />
      </Secao>

      {relatorio.porCoordenador.length > 0 && (
        <Secao titulo="Por coordenador" ajuda="O.S. do período encaminhadas a cada coordenador. Execução: de receber a O.S. até informar que terminou">
          <Tabela
            colunas={['Coordenador', 'Recebeu', 'Concluídas', 'Em aberto', 'No prazo', 'Execução média']}
            linhas={relatorio.porCoordenador.map((g) => [
              g.rotulo,
              String(g.recebidos),
              String(g.concluidos),
              String(g.emAberto),
              g.noPrazoPct === null ? '—' : `${g.noPrazoPct}%`,
              g.tempoExecucaoHoras === null ? '—' : formatarDias(g.tempoExecucaoHoras / 24),
            ])}
          />
        </Secao>
      )}
    </div>
  );
}

function Numero({ rotulo, valor, detalhe, alerta }: { rotulo: string; valor: number | string; detalhe?: string; alerta?: boolean }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3">
      <p className="text-2xl font-bold tabular-nums text-gray-900">{valor}</p>
      <p className="text-xs font-semibold text-gray-700">{rotulo}</p>
      {detalhe && <p className={`text-[11px] ${alerta ? 'text-red-700 font-semibold' : 'text-gray-500'}`}>{detalhe}</p>}
    </div>
  );
}

function Secao({ titulo, ajuda, children }: { titulo: string; ajuda: string; children: ReactNode }) {
  return (
    <section className="bg-white rounded-xl border border-gray-200 p-4 break-inside-avoid">
      <h3 className="text-sm font-bold text-gray-900">{titulo}</h3>
      <p className="text-[11px] text-gray-500 mb-3">{ajuda}</p>
      {children}
    </section>
  );
}

/** Barras horizontais de uma cor só (quantidade), com o número escrito ao lado */
function Barras({ grupos, texto }: { grupos: LinhaGrupo[]; texto: (g: LinhaGrupo) => string }) {
  const maior = Math.max(1, ...grupos.map((g) => g.recebidos));
  return (
    <ul className="space-y-2">
      {grupos.map((g) => (
        <li key={g.chave} className="grid grid-cols-[minmax(0,7rem)_1fr] sm:grid-cols-[minmax(0,12rem)_1fr] items-center gap-3 text-sm" title={`${g.rotulo}: ${texto(g)}`}>
          <span className="truncate text-gray-700">{g.rotulo}</span>
          <span className="min-w-0">
            <span className="flex h-3 items-center rounded-r bg-gray-100">
              <span
                className="h-3 rounded-r bg-[#006653]"
                style={{ width: `${Math.max(2, (g.recebidos / maior) * 100)}%`, printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}
              />
            </span>
            <span className="block text-[11px] text-gray-600 mt-0.5">{texto(g)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function Tabela({ colunas, linhas }: { colunas: string[]; linhas: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-[11px] uppercase text-gray-500">
            {colunas.map((c, i) => (
              <th key={c} className={`py-1.5 pr-3 font-semibold ${i > 0 ? 'text-right' : ''}`}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={l[0]} className="border-b border-gray-100 last:border-0">
              {l.map((v, i) => (
                <td key={i} className={`py-1.5 pr-3 ${i > 0 ? 'text-right tabular-nums text-gray-700' : 'text-gray-900'}`}>
                  {v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Versão para imprimir / salvar em PDF */
function FolhaRelatorio({ relatorio, periodo }: { relatorio: Relatorio; periodo: Periodo }) {
  return (
    <div className="ct-folha bg-white text-gray-900">
      <header className="flex items-center gap-3 border-b-2 border-[#006653] pb-2 mb-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/brasao-trindade.png" alt="" className="h-14 w-auto" />
        <div className="flex-1 leading-tight">
          <p className="text-[13px] font-bold uppercase tracking-wide">Prefeitura Municipal de Trindade</p>
          <p className="text-[12px]">Secretaria Municipal de Infraestrutura</p>
          <p className="mt-0.5 text-[15px] font-bold text-[#006653]">Relatório de atendimento · Conecta Trindade</p>
        </div>
        <div className="text-right text-[11px] leading-tight">
          <p className="font-semibold">Período</p>
          <p>{periodo.rotulo}</p>
          <p className="text-gray-500 mt-1">Emitido em {new Date().toLocaleDateString('pt-BR')}</p>
        </div>
      </header>
      <ConteudoRelatorio relatorio={relatorio} impressao />
      <p className="mt-3 border-t border-gray-300 pt-1.5 text-[10px] text-gray-600">
        Números calculados pelo Conecta Trindade com os pedidos abertos no período. Sem dados pessoais dos cidadãos.
      </p>
    </div>
  );
}
