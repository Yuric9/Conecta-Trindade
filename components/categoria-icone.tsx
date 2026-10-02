import { getCategoriaInfo } from '@/lib/types';
import { iconeCategoria, iconeOrgao } from '@/lib/map-icons';
import { cn } from '@/lib/utils';

/** Ícone desenhado da categoria do chamado (substitui os emojis). */
export function CategoriaIcone({ categoria, className }: { categoria: string; className?: string }) {
  const info = getCategoriaInfo(categoria);
  const Icone = iconeCategoria(info.id);
  return <Icone className={cn('w-4 h-4 flex-shrink-0', className)} style={{ color: info.cor }} aria-hidden />;
}

/** Ícone desenhado do tipo de prédio público. */
export function OrgaoIcone({ tipo, cor, className }: { tipo: string; cor?: string; className?: string }) {
  const Icone = iconeOrgao(tipo);
  return <Icone className={cn('w-4 h-4 flex-shrink-0', className)} style={cor ? { color: cor } : undefined} aria-hidden />;
}
