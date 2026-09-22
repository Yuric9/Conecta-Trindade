import type { ChamadoRow } from '@/lib/supabase';

declare global {
  // eslint-disable-next-line no-var
  var __conectaTrindadeChamados: ChamadoRow[] | undefined;
}

/**
 * Compatibilidade para testes locais explícitos.
 * Não contém seeds e nunca é usado pelas APIs em produção.
 */
function assertDevelopment() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('MEMORY_STORAGE_DISABLED_IN_PRODUCTION');
  }
}

export function getSharedChamadosMemory(): ChamadoRow[] {
  assertDevelopment();
  if (!global.__conectaTrindadeChamados) global.__conectaTrindadeChamados = [];
  return global.__conectaTrindadeChamados;
}

export function addSharedChamado(chamado: ChamadoRow): void {
  assertDevelopment();
  const list = getSharedChamadosMemory();
  const index = list.findIndex((item) => item.id === chamado.id || item.protocolo === chamado.protocolo);
  if (index >= 0) list[index] = chamado;
  else list.unshift(chamado);
}

export function updateSharedChamadoStatus(
  identifier: string,
  novoStatus: ChamadoRow['status'],
  observacao?: string
): ChamadoRow | null {
  assertDevelopment();
  const list = getSharedChamadosMemory();
  const clean = identifier.trim().toLowerCase();
  const chamado = list.find((item) => item.id.toLowerCase() === clean || item.protocolo.toLowerCase() === clean);
  if (!chamado) return null;
  chamado.status = novoStatus;
  chamado.updated_at = new Date().toISOString();
  if (observacao !== undefined) chamado.observacoes_internas = observacao;
  return chamado;
}
