import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { requireStaff } from '@/lib/supabase/server-auth';
import { isWithinTrindade } from '@/lib/geo';
import { ORGAOS_PUBLICOS_TRINDADE, type OrgaoPublico, type TipoOrgaoPublico } from '@/lib/public-places';

/**
 * Prédios públicos do mapa (tabela orgaos_publicos).
 *  - GET: lista pública (o mapa do site usa).
 *  - PUT: cria ou altera um prédio (só admin).
 *  - DELETE ?id=...: apaga um prédio (só admin).
 *  - POST { acao: 'restaurar' }: volta para a lista original (só admin).
 */

const TIPOS: TipoOrgaoPublico[] = ['PREFEITURA', 'SECRETARIA', 'UBS', 'HOSPITAL_UPA', 'ESCOLA', 'CMEI', 'PARQUE', 'SERVICO', 'ECOPONTO'];
const COLUNAS = 'id, nome, tipo, latitude, longitude, endereco, bairro, telefone, horario, descricao, ordem';

type LinhaOrgao = {
  id: string;
  nome: string;
  tipo: TipoOrgaoPublico;
  latitude: number;
  longitude: number;
  endereco: string;
  bairro: string;
  telefone: string | null;
  horario: string | null;
  descricao: string | null;
  ordem: number;
};

// Modo demonstração (sem Supabase): lista em memória do servidor
let memoria: LinhaOrgao[] = ORGAOS_PUBLICOS_TRINDADE.map((o, i) => paraLinha(o, i + 1));

function paraLinha(o: Partial<OrgaoPublico>, ordem = 0): LinhaOrgao {
  return {
    id: String(o.id),
    nome: String(o.nome),
    tipo: o.tipo as TipoOrgaoPublico,
    latitude: Number(o.latitude),
    longitude: Number(o.longitude),
    endereco: o.endereco || '',
    bairro: o.bairro || '',
    telefone: o.telefone || null,
    horario: o.horario || null,
    descricao: o.descricao || null,
    ordem,
  };
}

const texto = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** Confere os dados enviados pelo painel. Devolve a linha ou a mensagem de erro. */
function validar(body: any): LinhaOrgao | string {
  const id = texto(body?.id, 60);
  if (!/^[a-z0-9-]{3,60}$/.test(id)) return 'Identificador do prédio inválido.';
  const nome = texto(body?.nome, 200);
  if (nome.length < 3) return 'Informe o nome do prédio.';
  if (!TIPOS.includes(body?.tipo)) return 'Tipo de prédio inválido.';
  const latitude = Number(body?.latitude);
  const longitude = Number(body?.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !isWithinTrindade(latitude, longitude)) {
    return 'A localização do prédio precisa estar dentro de Trindade.';
  }
  return {
    id,
    nome,
    tipo: body.tipo,
    latitude,
    longitude,
    endereco: texto(body?.endereco, 300),
    bairro: texto(body?.bairro, 120),
    telefone: texto(body?.telefone, 40) || null,
    horario: texto(body?.horario, 120) || null,
    descricao: texto(body?.descricao, 600) || null,
    ordem: Number.isInteger(body?.ordem) ? body.ordem : 0,
  };
}

const erro = (status: number, mensagem: string) =>
  NextResponse.json({ success: false, error: mensagem }, { status });

export async function GET() {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ success: true, orgaos: memoria, source: 'memory' });
  }
  const { data, error } = await (supabase.from('orgaos_publicos') as any)
    .select(COLUNAS)
    .order('ordem', { ascending: true })
    .order('nome', { ascending: true });
  if (error) {
    console.error('[API Órgãos] erro ao listar:', error);
    return erro(500, 'Não foi possível carregar os prédios públicos.');
  }
  return NextResponse.json({ success: true, orgaos: data || [] });
}

export async function PUT(req: NextRequest) {
  const auth = await requireStaff(req, { adminOnly: true });
  if ('response' in auth) return auth.response;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return erro(400, 'Dados inválidos.');
  }
  const linha = validar(body);
  if (typeof linha === 'string') return erro(400, linha);

  if (!auth.client) {
    const i = memoria.findIndex((o) => o.id === linha.id);
    if (i >= 0) memoria[i] = { ...linha, ordem: memoria[i].ordem };
    else memoria = [{ ...linha, ordem: 0 }, ...memoria];
    return NextResponse.json({ success: true, orgao: linha });
  }

  // Prédio novo entra no topo da lista (ordem 0); prédio existente mantém a posição
  const { ordem: _ordem, ...semOrdem } = linha;
  const { data, error } = await (auth.client.from('orgaos_publicos') as any)
    .upsert(semOrdem, { onConflict: 'id' })
    .select(COLUNAS)
    .single();
  if (error) {
    console.error('[API Órgãos] erro ao salvar:', error);
    return erro(500, 'Não foi possível salvar o prédio.');
  }
  return NextResponse.json({ success: true, orgao: data });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireStaff(req, { adminOnly: true });
  if ('response' in auth) return auth.response;

  const id = new URL(req.url).searchParams.get('id') || '';
  if (!/^[a-z0-9-]{3,60}$/.test(id)) return erro(400, 'Identificador do prédio inválido.');

  if (!auth.client) {
    memoria = memoria.filter((o) => o.id !== id);
    return NextResponse.json({ success: true });
  }

  const { error } = await (auth.client.from('orgaos_publicos') as any).delete().eq('id', id);
  if (error) {
    console.error('[API Órgãos] erro ao apagar:', error);
    return erro(500, 'Não foi possível apagar o prédio.');
  }
  return NextResponse.json({ success: true });
}

export async function POST(req: NextRequest) {
  const auth = await requireStaff(req, { adminOnly: true });
  if ('response' in auth) return auth.response;

  const body = await req.json().catch(() => null);
  if (body?.acao !== 'restaurar') return erro(400, 'Ação desconhecida.');

  const original = ORGAOS_PUBLICOS_TRINDADE.map((o, i) => paraLinha(o, i + 1));

  if (!auth.client) {
    memoria = original;
    return NextResponse.json({ success: true, orgaos: memoria });
  }

  // Apaga os que não fazem parte da lista original e regrava os originais
  const ids = original.map((o) => o.id);
  const { error: erroApagar } = await (auth.client.from('orgaos_publicos') as any)
    .delete()
    .not('id', 'in', `(${ids.join(',')})`);
  const { error: erroGravar } = await (auth.client.from('orgaos_publicos') as any).upsert(original, { onConflict: 'id' });
  if (erroApagar || erroGravar) {
    console.error('[API Órgãos] erro ao restaurar:', erroApagar || erroGravar);
    return erro(500, 'Não foi possível restaurar a lista original.');
  }
  return NextResponse.json({ success: true, orgaos: original });
}
