/**
 * Fotos das O.S. no Storage do Supabase (bucket privado "fotos-os").
 *
 * No banco fica só o endereço da foto, no formato
 *   https://<projeto>.supabase.co/storage/v1/object/authenticated/fotos-os/<id da O.S.>/<arquivo>
 * Esse endereço sozinho não abre a foto: quem tem permissão recebe um
 * link temporário (assinarFotos). Fotos antigas, gravadas como texto
 * (data:image/...), continuam funcionando como antes.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export const BUCKET_FOTOS = 'fotos-os';
const MARCA = `/storage/v1/object/authenticated/${BUCKET_FOTOS}/`;
/** Validade do link temporário: 6 horas */
const VALIDADE_SEGUNDOS = 6 * 3600;

/** É uma foto guardada no Storage? Devolve o caminho dentro do bucket. */
export function caminhoDaFoto(valor: string | null | undefined): string | null {
  if (!valor) return null;
  const i = valor.indexOf(MARCA);
  return i >= 0 ? decodeURIComponent(valor.slice(i + MARCA.length)) : null;
}

/** Endereço que fica gravado no banco para um caminho do bucket */
export function enderecoDaFoto(caminho: string): string {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
  return `${base}${MARCA}${caminho}`;
}

/**
 * Envia uma foto (data:image/...;base64,...) para o Storage.
 * Só no servidor, com a chave secreta. Devolve o endereço para gravar no banco.
 */
export async function enviarFoto(
  admin: SupabaseClient,
  chamadoId: string,
  tipo: 'cidadao' | 'execucao',
  dataUrl: string
): Promise<string> {
  const m = dataUrl.match(/^data:(image\/(jpeg|png|webp));base64,(.+)$/);
  if (!m) throw new Error('Foto inválida');
  const conteudo = Buffer.from(m[3], 'base64');
  if (conteudo.length > 3 * 1024 * 1024) throw new Error('Foto grande demais');
  const extensao = m[2] === 'jpeg' ? 'jpg' : m[2];
  const caminho = `${chamadoId}/${tipo}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}.${extensao}`;
  const { error } = await admin.storage.from(BUCKET_FOTOS).upload(caminho, conteudo, {
    contentType: m[1],
    upsert: false,
  });
  if (error) throw error;
  return enderecoDaFoto(caminho);
}

/**
 * Troca os endereços do Storage por links temporários que abrem a foto.
 * Funciona no navegador (com a sessão de quem está logado: o banco confere
 * a permissão) e no servidor (com a chave secreta). O que não for do
 * Storage volta igual. Foto sem permissão volta null.
 */
export async function assinarFotos(
  cliente: SupabaseClient,
  valores: (string | null | undefined)[]
): Promise<Map<string, string | null>> {
  const resultado = new Map<string, string | null>();
  const caminhos = Array.from(
    new Set(valores.map((v) => caminhoDaFoto(v)).filter((c): c is string => Boolean(c)))
  );
  if (caminhos.length === 0) return resultado;

  const { data, error } = await cliente.storage.from(BUCKET_FOTOS).createSignedUrls(caminhos, VALIDADE_SEGUNDOS);
  const porCaminho = new Map<string, string | null>();
  if (!error && data) {
    for (const item of data) {
      if (item.path) porCaminho.set(item.path, item.signedUrl && !item.error ? item.signedUrl : null);
    }
  }
  for (const v of valores) {
    const c = caminhoDaFoto(v);
    if (v && c) resultado.set(v, porCaminho.get(c) ?? null);
  }
  return resultado;
}

/** Aplica os links temporários em uma lista de objetos (campos de foto indicados) */
export async function assinarFotosDaLista<T extends Record<string, any>>(
  cliente: SupabaseClient,
  lista: T[],
  campos: (keyof T)[]
): Promise<T[]> {
  const valores = lista.flatMap((item) =>
    campos.flatMap((campo) => {
      const v = item[campo];
      return Array.isArray(v) ? v : [v];
    })
  ) as (string | null | undefined)[];
  const links = await assinarFotos(cliente, valores);
  if (links.size === 0) return lista;
  const trocar = (v: any) => (typeof v === 'string' && links.has(v) ? links.get(v) : v);
  return lista.map((item) => {
    const novo: Record<string, any> = { ...item };
    for (const campo of campos) {
      const v = item[campo];
      novo[campo as string] = Array.isArray(v) ? v.map(trocar).filter(Boolean) : trocar(v);
    }
    return novo as T;
  });
}
