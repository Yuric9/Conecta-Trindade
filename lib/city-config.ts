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

const STORAGE_KEY_CONFIG = 'conecta_trindade_city_config';

export function getCityConfig(): CityConfig {
  if (typeof window === 'undefined') return DEFAULT_CITY_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(DEFAULT_CITY_CONFIG));
      return DEFAULT_CITY_CONFIG;
    }
    return { ...DEFAULT_CITY_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CITY_CONFIG;
  }
}

export function saveCityConfig(config: CityConfig): CityConfig {
  if (typeof window === 'undefined') return config;
  try {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
    return config;
  } catch {
    return config;
  }
}
