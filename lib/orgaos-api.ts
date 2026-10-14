/**
 * Prédios públicos do mapa, lidos e gravados no banco (via /api/orgaos).
 * Se o banco não responder, o mapa usa a lista original do código.
 */
import { authHeaders } from '@/lib/auth-headers';
import {
  ORGAOS_PUBLICOS_TRINDADE,
  getOrgaoVisualProps,
  type OrgaoPublico,
  type TipoOrgaoPublico,
} from '@/lib/public-places';

/** Linha do banco → prédio com cor, ícone e rótulo do tipo */
function comVisual(linha: any): OrgaoPublico {
  return {
    id: linha.id,
    nome: linha.nome,
    tipo: linha.tipo as TipoOrgaoPublico,
    ...getOrgaoVisualProps(linha.tipo),
    latitude: Number(linha.latitude),
    longitude: Number(linha.longitude),
    endereco: linha.endereco || '',
    bairro: linha.bairro || '',
    telefone: linha.telefone || undefined,
    horario: linha.horario || undefined,
    descricao: linha.descricao || undefined,
  };
}

async function resposta(res: Response, mensagemPadrao: string) {
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.success) throw new Error(data?.error || mensagemPadrao);
  return data;
}

export async function carregarOrgaos(): Promise<OrgaoPublico[]> {
  try {
    const res = await fetch('/api/orgaos', { cache: 'no-store' });
    const data = await resposta(res, 'Não foi possível carregar os prédios públicos.');
    return (data.orgaos as any[]).map(comVisual);
  } catch {
    return ORGAOS_PUBLICOS_TRINDADE;
  }
}

export async function salvarOrgao(orgao: OrgaoPublico): Promise<OrgaoPublico> {
  const res = await fetch('/api/orgaos', {
    method: 'PUT',
    headers: await authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(orgao),
  });
  const data = await resposta(res, 'Não foi possível salvar o prédio.');
  return comVisual(data.orgao);
}

export async function apagarOrgao(id: string): Promise<void> {
  const res = await fetch(`/api/orgaos?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: await authHeaders(),
  });
  await resposta(res, 'Não foi possível apagar o prédio.');
}

export async function restaurarOrgaos(): Promise<OrgaoPublico[]> {
  const res = await fetch('/api/orgaos', {
    method: 'POST',
    headers: await authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ acao: 'restaurar' }),
  });
  const data = await resposta(res, 'Não foi possível restaurar a lista original.');
  return (data.orgaos as any[]).map(comVisual);
}
