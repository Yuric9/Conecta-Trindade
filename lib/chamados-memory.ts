import type { ChamadoRow } from '@/lib/supabase';

/**
 * Conecta-Trindade - Armazenamento de Memória Compartilhado
 * Utilizado para persistência de fallback quando o banco Supabase
 * não estiver configurado ou em ambiente de demonstração e testes.
 */

// Global singleton para garantir persistência através de diferentes rotas de API no Node.js/Next.js
declare global {
  // eslint-disable-next-line no-var
  var __conectaTrindadeChamados: ChamadoRow[] | undefined;
}

const SEED_CHAMADOS: ChamadoRow[] = [
  {
    id: 'demo-ch-001',
    protocolo: 'TRIN-2026-1001',
    nome_cidadao: 'João Pereira da Silva',
    cpf_cidadao: '123.456.789-00',
    telefone_cidadao: '(62) 98765-4321',
    categoria_servico: 'Iluminação Pública',
    descricao: 'Lâmpada de vapor de sódio queimada no poste em frente à residência nº 145, deixando a via muito escura.',
    endereco: 'Rua das Acácias, Qd. 12, Lt. 05, Setor Central, Trindade - GO',
    foto_url: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=800&auto=format&fit=crop&q=60',
    status: 'Pendente',
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: 'demo-ch-002',
    protocolo: 'TRIN-2026-2045',
    nome_cidadao: 'Maria de Lourdes Santos',
    cpf_cidadao: '987.654.321-99',
    telefone_cidadao: '(62) 99234-5678',
    categoria_servico: 'Tapa-Buracos / Pavimentação',
    descricao: 'Buraco de grande proporção no asfalto danificando pneus e com risco iminente de acidente com motociclistas.',
    endereco: 'Av. Manoel Monteiro, próx. ao nº 880, Centro, Trindade - GO',
    foto_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop&q=60',
    status: 'Em Andamento',
    created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 6).toISOString(),
  },
  {
    id: 'demo-ch-003',
    protocolo: 'TRIN-2026-3190',
    nome_cidadao: 'Carlos Alberto Ferreira',
    cpf_cidadao: '123.456.789-00',
    telefone_cidadao: '(62) 98111-2233',
    categoria_servico: 'Limpeza Urbana e Entulhos',
    descricao: 'Acúmulo de entulhos de construção e galhos na calçada e sarjeta impedindo a passagem de pedestres e cadeirantes.',
    endereco: 'Rua 104, Qd. 15, Setor Maysa 1, Trindade - GO',
    foto_url: 'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?w=800&auto=format&fit=crop&q=60',
    status: 'Concluído',
    created_at: new Date(Date.now() - 3600000 * 72).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
  {
    id: 'demo-ch-004',
    protocolo: 'OS-2026-0001',
    nome_cidadao: 'Lucas Gabriel Moreira',
    cpf_cidadao: '555.666.777-88',
    telefone_cidadao: '(62) 98111-2233',
    categoria_servico: 'Iluminação Pública',
    descricao: 'Poste com lâmpada piscando continuamente há 3 noites na esquina da avenida.',
    endereco: 'Av. Manoel Monteiro, Centro, Trindade - GO',
    foto_url: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=600&auto=format&fit=crop&q=60',
    status: 'Em Andamento',
    created_at: new Date(Date.now() - 36 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 12 * 3600000).toISOString(),
  },
  {
    id: 'demo-ch-005',
    protocolo: 'OS-2026-0004',
    nome_cidadao: 'Fernanda Rocha Lima',
    cpf_cidadao: '444.333.222-11',
    telefone_cidadao: '(62) 98777-8899',
    categoria_servico: 'Vazamento de Água / Esgoto',
    descricao: 'Vazamento contínuo de água tratada na rede pública minando asfalto em frente ao comércio.',
    endereco: 'Av. Raimundo de Aquino, Vila Santa Inês, Trindade - GO',
    foto_url: null,
    status: 'Concluído',
    created_at: new Date(Date.now() - 72 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 10 * 3600000).toISOString(),
  },
  {
    id: 'demo-ch-006',
    protocolo: 'TRIN-2026-5088',
    nome_cidadao: 'Juliana Mendes Silva',
    cpf_cidadao: '123.456.789-00',
    telefone_cidadao: '(62) 99123-4567',
    categoria_servico: 'Roçagem e Capina',
    descricao: 'Mato muito alto no canteiro central e lote público da praça, atraindo insetos e animais peçonhentos.',
    endereco: 'Av. Contorno, Qd. 08, Lt. 14, Setor Cristina, Trindade - GO',
    foto_url: 'https://images.unsplash.com/photo-1592417817098-8f3d69109853?w=800&auto=format&fit=crop&q=60',
    status: 'Em Andamento',
    created_at: new Date(Date.now() - 18 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 4 * 3600000).toISOString(),
  },
];

if (!global.__conectaTrindadeChamados) {
  global.__conectaTrindadeChamados = [...SEED_CHAMADOS];
}

export function getSharedChamadosMemory(): ChamadoRow[] {
  if (!global.__conectaTrindadeChamados) {
    global.__conectaTrindadeChamados = [...SEED_CHAMADOS];
  }
  return global.__conectaTrindadeChamados;
}

export function addSharedChamado(chamado: ChamadoRow): void {
  const list = getSharedChamadosMemory();
  // Evitar duplicatas por protocolo ou ID
  const existingIdx = list.findIndex(
    (c) => c.id === chamado.id || (chamado.protocolo && c.protocolo === chamado.protocolo)
  );
  if (existingIdx >= 0) {
    list[existingIdx] = chamado;
  } else {
    list.unshift(chamado);
  }
}

export function updateSharedChamadoStatus(
  identifier: string,
  novoStatus: ChamadoRow['status'],
  observacao?: string
): ChamadoRow | null {
  const list = getSharedChamadosMemory();
  const clean = identifier.trim().toLowerCase();
  const chamado = list.find(
    (c) => c.id.toLowerCase() === clean || c.protocolo.toLowerCase() === clean
  );
  if (chamado) {
    chamado.status = novoStatus;
    chamado.updated_at = new Date().toISOString();
    if (observacao) {
      (chamado as any).observacoes_internas = observacao;
    }
    return chamado;
  }
  return null;
}
