export interface CityConfig {
  ouvidoriaWhatsapp: string;
  disqueLimpezaTelefone: string;
  horarioAtendimento: string;
  palacioEndereco: string;
  avisoCidadao: {
    ativo: boolean;
    tipo: 'info' | 'alerta' | 'urgente';
    mensagem: string;
  };
}

export const DEFAULT_CITY_CONFIG: CityConfig = {
  ouvidoriaWhatsapp: '556235067000',
  disqueLimpezaTelefone: '(62) 3506-7028',
  horarioAtendimento: 'Segunda a Sexta das 07:30 às 17:30',
  palacioEndereco: 'Praça Constantino Xavier, nº 330, Centro, Trindade - GO',
  avisoCidadao: {
    ativo: true,
    tipo: 'info',
    mensagem: 'Plantão de Zelo Urbano ativo em todas as regiões de Trindade. Utilize o cronograma RSU para consultar a coleta no seu bairro.',
  },
};

const texto = (v: unknown, padrao: string, max: number) =>
  typeof v === 'string' ? v.trim().slice(0, max) : padrao;

/**
 * Completa com os valores padrão e descarta o que não for válido.
 * Usado no servidor (antes de gravar no banco) e no navegador.
 */
export function normalizarCityConfig(valor: unknown): CityConfig {
  const v = (valor && typeof valor === 'object' ? valor : {}) as Partial<CityConfig>;
  const aviso = (v.avisoCidadao && typeof v.avisoCidadao === 'object' ? v.avisoCidadao : {}) as Partial<CityConfig['avisoCidadao']>;
  const padrao = DEFAULT_CITY_CONFIG;
  return {
    ouvidoriaWhatsapp: texto(v.ouvidoriaWhatsapp, padrao.ouvidoriaWhatsapp, 20).replace(/\D/g, ''),
    disqueLimpezaTelefone: texto(v.disqueLimpezaTelefone, padrao.disqueLimpezaTelefone, 40),
    horarioAtendimento: texto(v.horarioAtendimento, padrao.horarioAtendimento, 120),
    palacioEndereco: texto(v.palacioEndereco, padrao.palacioEndereco, 200),
    avisoCidadao: {
      ativo: typeof aviso.ativo === 'boolean' ? aviso.ativo : padrao.avisoCidadao.ativo,
      tipo: aviso.tipo === 'alerta' || aviso.tipo === 'urgente' || aviso.tipo === 'info' ? aviso.tipo : padrao.avisoCidadao.tipo,
      mensagem: texto(aviso.mensagem, padrao.avisoCidadao.mensagem, 300),
    },
  };
}

/** Configurações da cidade gravadas no banco (via /api/config). */
export async function carregarCityConfig(): Promise<CityConfig> {
  try {
    const res = await fetch('/api/config', { cache: 'no-store' });
    if (!res.ok) return DEFAULT_CITY_CONFIG;
    const data = await res.json();
    return normalizarCityConfig(data?.config?.cidade);
  } catch {
    return DEFAULT_CITY_CONFIG;
  }
}

/** Grava as configurações da cidade (só administradores). */
export async function salvarCityConfig(config: CityConfig): Promise<CityConfig> {
  // Import dinâmico: este arquivo também é usado no servidor (/api/config)
  const { authHeaders } = await import('@/lib/auth-headers');
  const res = await fetch('/api/config', {
    method: 'PATCH',
    headers: await authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ cidade: config }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.success) throw new Error(data?.error || 'Não foi possível salvar as configurações.');
  return normalizarCityConfig(data.config?.cidade);
}
