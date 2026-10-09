'use client';

/**
 * Ficha da O.S. (tela e papel).
 *
 * - <FolhaOS>: a O.S. completa em formato de folha A4, com QR Code do local.
 * - <FolhaListaOS>: várias O.S. numa folha só (roteiro do dia).
 * - <AreaImpressao>: coloca a folha direto no <body> e chama a impressão do
 *   navegador. O CSS de impressão (globals.css) esconde o resto do site, então
 *   sai no papel (ou no "Salvar como PDF") só a folha.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import QRCode from 'qrcode';
import { getCategoriaInfo, normalizeCategoria, formatData } from '@/lib/types';
import { STATUS_OS_INFO } from '@/lib/os-status';
import { linkMapaOS, textoPrazoOS, type MinhaOS } from '@/lib/coordenador-os';

const PRIORIDADES: Record<string, string> = { BAIXA: 'Baixa', MEDIA: 'Média', ALTA: 'Alta', URGENTE: 'Urgente' };

/** Gera o QR Code como imagem (feito no próprio navegador, sem site externo). */
export function gerarQrCode(texto: string, largura = 240): Promise<string> {
  return QRCode.toDataURL(texto, { margin: 1, width: largura, errorCorrectionLevel: 'M' });
}

/** QR Code do local de cada O.S. ({ id: imagem }). */
export async function gerarQrCodesOS(lista: MinhaOS[], largura = 240): Promise<Record<string, string>> {
  const pares = await Promise.all(lista.map(async (os) => [os.id, await gerarQrCode(linkMapaOS(os), largura)] as const));
  return Object.fromEntries(pares);
}

function fotoSegura(url: string | null): string | null {
  return url && /^(https:\/\/|data:image\/)/.test(url) ? url : null;
}

function Cabecalho({ titulo, direita }: { titulo: string; direita: ReactNode }) {
  return (
    <header className="flex items-center gap-3 border-b-2 border-[#006653] pb-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/brasao-trindade.png" alt="" className="h-14 w-auto" />
      <div className="flex-1 leading-tight">
        <p className="text-[13px] font-bold uppercase tracking-wide">Prefeitura Municipal de Trindade</p>
        <p className="text-[12px]">Secretaria Municipal de Infraestrutura</p>
        <p className="mt-0.5 text-[15px] font-bold text-[#006653]">{titulo}</p>
      </div>
      <div className="text-right leading-tight">{direita}</div>
    </header>
  );
}

function RodapeLGPD() {
  return (
    <p className="mt-3 border-t border-gray-300 pt-1.5 text-[10px] text-gray-600">
      Documento interno: contém dados pessoais do cidadão (LGPD, Lei 13.709/2018). Use só para executar o serviço e não
      deixe em local público. Emitido em {formatData(new Date().toISOString())} pelo Conecta Trindade.
    </p>
  );
}

function Campo({ rotulo, children, className = '' }: { rotulo: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">{rotulo}</p>
      <div className="text-[13px] text-gray-900">{children}</div>
    </div>
  );
}

function Linha({ rotulo }: { rotulo: string }) {
  return (
    <div className="flex items-end gap-2 text-[12px]">
      <span className="shrink-0">{rotulo}</span>
      <span className="flex-1 border-b border-gray-400" style={{ height: '1.2em' }} />
    </div>
  );
}

/** A O.S. completa. Serve na tela (janela "Ficha") e no papel. */
export function FolhaOS({ os, qr }: { os: MinhaOS; qr: string | null }) {
  const cat = getCategoriaInfo(normalizeCategoria(os.categoria));
  const prazo = textoPrazoOS(os);
  const foto = fotoSegura(os.foto_url);
  const andamento: [string, string | null][] = [
    ['Aberta', os.created_at],
    ['Encaminhada', os.encaminhado_em],
    ['Vista', os.visualizado_em],
    ['Iniciada', os.iniciado_em],
    ['Executada', os.executado_em],
    ['Concluída', os.concluido_em],
  ];

  return (
    <div className="ct-folha bg-white text-gray-900">
      <Cabecalho
        titulo="Ordem de Serviço"
        direita={
          <>
            <p className="text-[10px] uppercase text-gray-500">Protocolo</p>
            <p className="font-mono text-[16px] font-bold">{os.protocolo}</p>
          </>
        }
      />

      <section className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
        <Campo rotulo="Serviço">
          <strong>{cat.label}</strong>
        </Campo>
        <Campo rotulo="Prioridade">{PRIORIDADES[os.prioridade] || os.prioridade}</Campo>
        <Campo rotulo="Situação">{STATUS_OS_INFO[os.status]?.label || os.status}</Campo>
        <Campo rotulo="Prazo">
          {os.sla_limite ? formatData(os.sla_limite) : '-'}
          {prazo && os.status !== 'Concluído' && <span className="block text-[11px] text-gray-600">{prazo}</span>}
        </Campo>
      </section>

      <section className="mt-3 flex items-start gap-3 rounded border border-gray-300 p-2.5">
        <div className="flex-1 space-y-2">
          <Campo rotulo="Local">
            <strong>{os.endereco || 'Sem endereço'}</strong>
            {Number.isFinite(os.latitude) && Number.isFinite(os.longitude) && (
              <span className="block text-[11px] text-gray-600">
                GPS: {Number(os.latitude).toFixed(6)}, {Number(os.longitude).toFixed(6)}
              </span>
            )}
          </Campo>
          <Campo rotulo="Solicitante">
            {os.nome_cidadao || 'Não informado'}
            {os.telefone_cidadao && <span className="ml-2">· Tel.: {os.telefone_cidadao}</span>}
          </Campo>
        </div>
        {qr && (
          <div className="w-[92px] shrink-0 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="QR Code do local no mapa" className="h-[92px] w-[92px]" />
            <p className="text-[9px] leading-tight text-gray-600">Aponte a câmera para abrir o local no mapa</p>
          </div>
        )}
      </section>

      <section className="mt-3">
        <Campo rotulo="O que o cidadão pediu">
          <p className="whitespace-pre-line">{os.descricao || 'Sem descrição.'}</p>
        </Campo>
      </section>

      {os.observacao_encaminhamento && (
        <section className="mt-2 rounded border border-amber-300 bg-amber-50 p-2">
          <Campo rotulo="Orientação da Secretaria">
            <p className="whitespace-pre-line">{os.observacao_encaminhamento}</p>
          </Campo>
        </section>
      )}

      {foto && (
        <section className="mt-3 break-inside-avoid">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Foto enviada pelo cidadão</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={foto}
            alt="Foto do local"
            className="mt-1 max-h-[65mm] max-w-full rounded border object-contain"
            // Foto que não abre (link quebrado): some da folha em vez de mostrar o ícone quebrado
            onError={(e) => {
              const secao = e.currentTarget.parentElement;
              if (secao) secao.style.display = 'none';
            }}
          />
        </section>
      )}

      <section className="mt-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Andamento</p>
        <div className="mt-1 grid grid-cols-3 gap-x-3 gap-y-0.5 text-[11px] sm:grid-cols-6">
          {andamento.map(([rotulo, data]) => (
            <p key={rotulo}>
              <span className="text-gray-500">{rotulo}:</span>
              <br />
              {data ? formatData(data) : '—'}
            </p>
          ))}
        </div>
      </section>

      <section className="mt-4 break-inside-avoid rounded border-2 border-gray-400 p-3">
        <p className="text-[12px] font-bold uppercase">Execução em campo (preencher à mão)</p>
        <div className="mt-2.5 grid grid-cols-3 gap-3">
          <Linha rotulo="Data:" />
          <Linha rotulo="Início:" />
          <Linha rotulo="Término:" />
        </div>
        <div className="mt-3 space-y-3">
          <Linha rotulo="Equipe:" />
          <Linha rotulo="Materiais usados:" />
          <Linha rotulo="O que foi feito:" />
          <Linha rotulo="" />
        </div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[12px]">
          <span>☐ Serviço executado</span>
          <span>☐ Executado em parte</span>
          <span>☐ Não executado (motivo acima)</span>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-6 text-center text-[11px]">
          <p className="border-t border-gray-500 pt-1">Assinatura do coordenador</p>
          <p className="border-t border-gray-500 pt-1">Visto da Secretaria</p>
        </div>
      </section>

      <RodapeLGPD />
    </div>
  );
}

/** Várias O.S. numa folha só: o roteiro para levar a campo. */
export function FolhaListaOS({
  titulo,
  responsavel,
  itens,
  qrs,
}: {
  titulo: string;
  responsavel: string;
  itens: MinhaOS[];
  qrs: Record<string, string>;
}) {
  return (
    <div className="ct-folha bg-white text-gray-900">
      <Cabecalho
        titulo={titulo}
        direita={
          <>
            <p className="text-[12px] font-semibold">{responsavel}</p>
            <p className="text-[11px] text-gray-600">{new Date().toLocaleDateString('pt-BR')}</p>
            <p className="text-[11px] text-gray-600">{itens.length} O.S.</p>
          </>
        }
      />
      <table className="mt-3 w-full border-collapse text-[11px]">
        <thead>
          <tr className="border-b-2 border-gray-400 text-left text-[10px] uppercase text-gray-600">
            <th className="py-1 pr-1">Nº</th>
            <th className="py-1 pr-2">O.S. / serviço</th>
            <th className="py-1 pr-2">Local e pedido</th>
            <th className="py-1 pr-2">Prazo</th>
            <th className="py-1 pr-2">Mapa</th>
            <th className="py-1 text-center">Feito</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((os, i) => {
            const cat = getCategoriaInfo(normalizeCategoria(os.categoria));
            return (
              <tr key={os.id} className="break-inside-avoid border-b border-gray-300 align-top">
                <td className="py-1.5 pr-1 font-bold">{i + 1}</td>
                <td className="py-1.5 pr-2">
                  <span className="block font-mono font-bold">{os.protocolo}</span>
                  {cat.label}
                  {(os.prioridade === 'ALTA' || os.prioridade === 'URGENTE') && (
                    <span className="block font-bold">{PRIORIDADES[os.prioridade]}</span>
                  )}
                </td>
                <td className="py-1.5 pr-2">
                  <strong>{os.endereco || 'Sem endereço'}</strong>
                  <span className="block text-gray-700">{(os.descricao || '').slice(0, 160)}</span>
                  <span className="block text-gray-600">
                    {os.nome_cidadao || 'Cidadão'}
                    {os.telefone_cidadao ? ` · ${os.telefone_cidadao}` : ''}
                  </span>
                  {os.observacao_encaminhamento && (
                    <span className="block italic">Secretaria: {os.observacao_encaminhamento}</span>
                  )}
                </td>
                <td className="py-1.5 pr-2 whitespace-nowrap">{os.sla_limite ? formatData(os.sla_limite).slice(0, 10) : '-'}</td>
                <td className="py-1.5 pr-2">
                  {qrs[os.id] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={qrs[os.id]} alt="QR Code do local" className="h-[64px] w-[64px]" />
                  )}
                </td>
                <td className="py-1.5 text-center text-[18px] leading-none">☐</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <RodapeLGPD />
    </div>
  );
}

/**
 * Põe o conteúdo direto no <body> (fora do site), espera as imagens
 * carregarem e abre a janela de impressão. Depois avisa com onFim.
 */
export function AreaImpressao({ children, onFim }: { children: ReactNode; onFim: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const fimRef = useRef(onFim);
  fimRef.current = onFim;
  const [montado, setMontado] = useState(false);

  useEffect(() => setMontado(true), []);

  useEffect(() => {
    if (!montado || !ref.current) return;
    let cancelado = false;
    // Só tira a folha da página depois que a janela de impressão fechar
    // (no celular a impressão não trava a página e precisa da folha ainda).
    const terminou = () => fimRef.current();
    window.addEventListener('afterprint', terminou, { once: true });
    const imagens = Array.from(ref.current.querySelectorAll('img'));
    const carregadas = Promise.all(
      imagens.map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise<void>((ok) => {
              img.addEventListener('load', () => ok(), { once: true });
              img.addEventListener('error', () => ok(), { once: true });
            })
      )
    );
    // Não espera mais que 4 s (foto pesada ou internet ruim)
    Promise.race([carregadas, new Promise((ok) => setTimeout(ok, 4000))]).then(() => {
      if (!cancelado) window.print();
    });
    return () => {
      cancelado = true;
      window.removeEventListener('afterprint', terminou);
    };
  }, [montado]);

  if (!montado) return null;
  return createPortal(
    <div ref={ref} className="ct-area-impressao">
      {children}
    </div>,
    document.body
  );
}
