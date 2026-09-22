export interface PortalConfig {
  menu_contexto_cards_ativo: boolean;
}

export const DEFAULT_PORTAL_CONFIG: PortalConfig = {
  menu_contexto_cards_ativo: true,
};

export async function getPortalConfig(): Promise<PortalConfig> {
  try {
    const response = await fetch('/api/config', { cache: 'no-store' });
    if (!response.ok) return DEFAULT_PORTAL_CONFIG;
    const data = await response.json();
    return { ...DEFAULT_PORTAL_CONFIG, ...(data.config || {}) };
  } catch {
    return DEFAULT_PORTAL_CONFIG;
  }
}

export async function savePortalConfig(config: PortalConfig): Promise<PortalConfig> {
  const response = await fetch('/api/config', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  if (!response.ok) throw new Error('Não foi possível salvar a configuração do portal.');
  const data = await response.json();
  return { ...DEFAULT_PORTAL_CONFIG, ...(data.config || config) };
}
