/**
 * Marcadores do mapa (Leaflet) no padrão de apps de mapa: pino em gota,
 * na cor do status/tipo, com um ícone desenhado em branco (lucide).
 * Substitui os emojis usados antes nos marcadores.
 */

import { renderToStaticMarkup } from 'react-dom/server';
import type { LucideIcon } from 'lucide-react';
import { infoStatusOS, STATUS_OS, STATUS_OS_INFO } from '@/lib/os-status';
import {
  Lightbulb,
  Construction,
  Trash2,
  Droplet,
  TreePine,
  Scissors,
  CircleAlert,
  Landmark,
  Building2,
  Stethoscope,
  Hospital,
  GraduationCap,
  Baby,
  Trees,
  Recycle,
  MapPin,
} from 'lucide-react';

// ---------------------------------------------------------------------
// Ícones
// ---------------------------------------------------------------------

const ICONES_CATEGORIA: Record<string, LucideIcon> = {
  ILUMINACAO: Lightbulb,
  BURACO: Construction,
  LIXO: Trash2,
  VAZAMENTO: Droplet,
  PODA: TreePine,
  ROCAGEM: Scissors,
  OUTROS: CircleAlert,
};

const ICONES_ORGAO: Record<string, LucideIcon> = {
  PREFEITURA: Landmark,
  SECRETARIA: Building2,
  SERVICO: Building2,
  UBS: Stethoscope,
  HOSPITAL_UPA: Hospital,
  ESCOLA: GraduationCap,
  CMEI: Baby,
  PARQUE: Trees,
  ECOPONTO: Recycle,
};

export function iconeCategoria(categoriaId: string): LucideIcon {
  return ICONES_CATEGORIA[categoriaId] || CircleAlert;
}

export function iconeOrgao(tipo: string): LucideIcon {
  return ICONES_ORGAO[tipo] || MapPin;
}

function svgDoIcone(Icone: LucideIcon, tamanho: number, cor = '#ffffff'): string {
  return renderToStaticMarkup(<Icone size={tamanho} color={cor} strokeWidth={2.25} />);
}

// ---------------------------------------------------------------------
// Cores por status (aceita os nomes novos e os legados)
// ---------------------------------------------------------------------

export function corDoStatus(status: string | null | undefined): { cor: string; label: string } {
  const { cor, label } = infoStatusOS(status);
  return { cor, label };
}

// Legenda única para o mapa e para a tela de chamados
export const LEGENDA_STATUS = STATUS_OS.filter((s) => s !== 'Cancelado').map((s) => ({
  cor: STATUS_OS_INFO[s].cor,
  label: STATUS_OS_INFO[s].label,
}));

// ---------------------------------------------------------------------
// HTML dos marcadores (usado em L.divIcon)
// ---------------------------------------------------------------------

/** Pino em gota, usado para chamados. Âncora na ponta inferior. */
export function pinoHtml(Icone: LucideIcon, cor: string, opcoes: { selecionado?: boolean } = {}): string {
  const escala = opcoes.selecionado ? 1.18 : 1;
  return `
    <div class="ct-pino" style="--ct-cor:${cor};transform:scale(${escala});">
      <svg width="34" height="44" viewBox="0 0 34 44" aria-hidden="true">
        <path d="M17 43c-.6 0-1.1-.3-1.4-.8C10.2 34.6 2 25.4 2 16.9 2 8.1 8.7 1.5 17 1.5S32 8.1 32 16.9c0 8.5-8.2 17.7-13.6 25.3-.3.5-.8.8-1.4.8z"
          fill="${cor}" stroke="#ffffff" stroke-width="2" />
      </svg>
      <span class="ct-pino-icone">${svgDoIcone(Icone, 16)}</span>
    </div>`;
}

/** Marcador circular menor e neutro, usado para prédios públicos. */
export function pontoHtml(Icone: LucideIcon, cor: string, contador = 0): string {
  return `
    <div class="ct-ponto" style="--ct-cor:${cor};">
      ${svgDoIcone(Icone, 14, cor)}
      ${contador > 0 ? `<span class="ct-ponto-contador">${contador}</span>` : ''}
    </div>`;
}

/** Ícone pequeno para usar dentro de popups/tooltips do mapa. */
export function iconeInlineHtml(Icone: LucideIcon, cor: string, tamanho = 14): string {
  return `<span style="display:inline-flex;vertical-align:-2px;">${svgDoIcone(Icone, tamanho, cor)}</span>`;
}

export const TAMANHO_PINO: [number, number] = [34, 44];
export const ANCORA_PINO: [number, number] = [17, 43];
export const TAMANHO_PONTO: [number, number] = [28, 28];
export const ANCORA_PONTO: [number, number] = [14, 14];
