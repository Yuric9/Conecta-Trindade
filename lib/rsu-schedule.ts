export type TurnoColeta = 'MATUTINO' | 'VESPERTINO';
export type DiaSemana = 'DOMINGO' | 'SEGUNDA' | 'TERCA' | 'QUARTA' | 'QUINTA' | 'SEXTA' | 'SABADO';
export type RegiaoRSU = 'CENTRO' | 'LESTE';

export interface ItemCronogramaRSU {
  id: string;
  bairro: string;
  frequenciaTexto: string;
  diasSemana: DiaSemana[];
  turno: TurnoColeta;
  regiao: RegiaoRSU;
  observacao?: string;
}

export const DIAS_SEMANA_MAP: Record<number, DiaSemana> = {
  0: 'DOMINGO',
  1: 'SEGUNDA',
  2: 'TERCA',
  3: 'QUARTA',
  4: 'QUINTA',
  5: 'SEXTA',
  6: 'SABADO',
};

export const DIAS_SEMANA_LABELS: Record<DiaSemana, { curto: string; longo: string; ordem: number }> = {
  DOMINGO: { curto: 'Dom', longo: 'Domingo', ordem: 0 },
  SEGUNDA: { curto: 'Seg', longo: 'Segunda-feira', ordem: 1 },
  TERCA: { curto: 'Ter', longo: 'Terça-feira', ordem: 2 },
  QUARTA: { curto: 'Qua', longo: 'Quarta-feira', ordem: 3 },
  QUINTA: { curto: 'Qui', longo: 'Quinta-feira', ordem: 4 },
  SEXTA: { curto: 'Sex', longo: 'Sexta-feira', ordem: 5 },
  SABADO: { curto: 'Sáb', longo: 'Sábado', ordem: 6 },
};

const DIAS_UTEIS_E_SABADO: DiaSemana[] = ['SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO'];

/**
 * BASE OFICIAL DO CRONOGRAMA DE COLETA DE RSU - MUNICÍPIO DE TRINDADE (117 SETORES/BAIRROS)
 * Transcrição exata da planilha oficial da Secretaria de Serviços Públicos de Trindade - GO
 */
export const CRONOGRAMA_OFICIAL_TRINDADE: ItemCronogramaRSU[] = [
  // 1 a 19: DIARIAMENTE
  { id: 'rsu-001', bairro: 'VILA PAI ETERNO (VILA PAI ENERTO)', frequenciaTexto: 'DIARIAMENTE', diasSemana: DIAS_UTEIS_E_SABADO, turno: 'VESPERTINO', regiao: 'CENTRO' },
  { id: 'rsu-002', bairro: 'JARDIM SALVADOR', frequenciaTexto: 'DIARIAMENTE', diasSemana: DIAS_UTEIS_E_SABADO, turno: 'MATUTINO', regiao: 'CENTRO' },
  { id: 'rsu-003', bairro: 'VILA SÃO COTTOLENGO', frequenciaTexto: 'DIARIAMENTE', diasSemana: DIAS_UTEIS_E_SABADO, turno: 'VESPERTINO', regiao: 'CENTRO' },
  { id: 'rsu-004', bairro: 'BAIRRO SANTUARIO', frequenciaTexto: 'DIARIAMENTE', diasSemana: DIAS_UTEIS_E_SABADO, turno: 'VESPERTINO', regiao: 'CENTRO' },
  { id: 'rsu-005', bairro: 'SÃO SALVADOR', frequenciaTexto: 'DIARIAMENTE', diasSemana: DIAS_UTEIS_E_SABADO, turno: 'VESPERTINO', regiao: 'CENTRO' },
  { id: 'rsu-006', bairro: 'ANA ROSA', frequenciaTexto: 'DIARIAMENTE', diasSemana: DIAS_UTEIS_E_SABADO, turno: 'VESPERTINO', regiao: 'CENTRO' },
  { id: 'rsu-007', bairro: 'SETOR CRISTINA II', frequenciaTexto: 'DIARIAMENTE', diasSemana: DIAS_UTEIS_E_SABADO, turno: 'VESPERTINO', regiao: 'CENTRO' },
  { id: 'rsu-008', bairro: 'SETOR CENTRAL', frequenciaTexto: 'DIARIAMENTE', diasSemana: DIAS_UTEIS_E_SABADO, turno: 'VESPERTINO', regiao: 'CENTRO' },
  { id: 'rsu-009', bairro: 'SETOR ABRAÃO MANOEL', frequenciaTexto: 'DIARIAMENTE', diasSemana: DIAS_UTEIS_E_SABADO, turno: 'MATUTINO', regiao: 'CENTRO' },
  { id: 'rsu-010', bairro: 'VILA SANTO ONOFRE', frequenciaTexto: 'DIARIAMENTE', diasSemana: DIAS_UTEIS_E_SABADO, turno: 'MATUTINO', regiao: 'CENTRO' },
  { id: 'rsu-011', bairro: 'VILA SANTO INES', frequenciaTexto: 'DIARIAMENTE', diasSemana: DIAS_UTEIS_E_SABADO, turno: 'MATUTINO', regiao: 'CENTRO' },
  { id: 'rsu-012', bairro: 'PERPETUO SOCORRO', frequenciaTexto: 'DIARIAMENTE', diasSemana: DIAS_UTEIS_E_SABADO, turno: 'MATUTINO', regiao: 'CENTRO' },
  { id: 'rsu-013', bairro: 'SETOR OESTE', frequenciaTexto: 'DIARIAMENTE', diasSemana: DIAS_UTEIS_E_SABADO, turno: 'MATUTINO', regiao: 'CENTRO' },
  { id: 'rsu-014', bairro: 'PADRE RENATO', frequenciaTexto: 'DIARIAMENTE', diasSemana: DIAS_UTEIS_E_SABADO, turno: 'MATUTINO', regiao: 'CENTRO' },
  { id: 'rsu-015', bairro: 'VILA GUILHERME', frequenciaTexto: 'DIARIAMENTE', diasSemana: DIAS_UTEIS_E_SABADO, turno: 'MATUTINO', regiao: 'CENTRO' },
  { id: 'rsu-016', bairro: 'VILA CARVELO', frequenciaTexto: 'DIARIAMENTE', diasSemana: DIAS_UTEIS_E_SABADO, turno: 'MATUTINO', regiao: 'CENTRO' },
  { id: 'rsu-017', bairro: 'VILA AUGUSTO', frequenciaTexto: 'DIARIAMENTE', diasSemana: DIAS_UTEIS_E_SABADO, turno: 'MATUTINO', regiao: 'CENTRO' },
  { id: 'rsu-018', bairro: 'VILA WILLIAN', frequenciaTexto: 'DIARIAMENTE', diasSemana: DIAS_UTEIS_E_SABADO, turno: 'MATUTINO', regiao: 'CENTRO' },
  { id: 'rsu-019', bairro: 'SETOR MAYSA - AV. ELISABETH M.', frequenciaTexto: 'DIARIAMENTE', diasSemana: DIAS_UTEIS_E_SABADO, turno: 'VESPERTINO', regiao: 'LESTE' },

  // 20 a 35: SEGUNDA, QUARTA E SEXTA (CENTRO) + CIDADE JARDIM
  { id: 'rsu-020', bairro: 'SETOR SUL', frequenciaTexto: 'SEGUNDA, QUARTA E SEXTA', diasSemana: ['SEGUNDA', 'QUARTA', 'SEXTA'], turno: 'VESPERTINO', regiao: 'CENTRO' },
  { id: 'rsu-021', bairro: 'VILA REDENÇÃO (VILA RENDENÇÃO)', frequenciaTexto: 'SEGUNDA, QUARTA E SEXTA', diasSemana: ['SEGUNDA', 'QUARTA', 'SEXTA'], turno: 'VESPERTINO', regiao: 'CENTRO' },
  { id: 'rsu-022', bairro: 'VILA AMADOR', frequenciaTexto: 'SEGUNDA, QUARTA E SEXTA', diasSemana: ['SEGUNDA', 'QUARTA', 'SEXTA'], turno: 'VESPERTINO', regiao: 'CENTRO' },
  { id: 'rsu-023', bairro: 'VILA JUSSARA', frequenciaTexto: 'SEGUNDA, QUARTA E SEXTA', diasSemana: ['SEGUNDA', 'QUARTA', 'SEXTA'], turno: 'VESPERTINO', regiao: 'CENTRO' },
  { id: 'rsu-024', bairro: 'SANTO AFONSO', frequenciaTexto: 'SEGUNDA, QUARTA E SEXTA', diasSemana: ['SEGUNDA', 'QUARTA', 'SEXTA'], turno: 'VESPERTINO', regiao: 'CENTRO' },
  { id: 'rsu-025', bairro: 'NOVO PARAISO', frequenciaTexto: 'SEGUNDA, QUARTA E SEXTA', diasSemana: ['SEGUNDA', 'QUARTA', 'SEXTA'], turno: 'VESPERTINO', regiao: 'CENTRO' },
  { id: 'rsu-026', bairro: 'ESTRELA DO NORTE', frequenciaTexto: 'SEGUNDA, QUARTA E SEXTA', diasSemana: ['SEGUNDA', 'QUARTA', 'SEXTA'], turno: 'VESPERTINO', regiao: 'CENTRO' },
  { id: 'rsu-027', bairro: 'RESERVA TRINDADE', frequenciaTexto: 'SEGUNDA, QUARTA E SEXTA', diasSemana: ['SEGUNDA', 'QUARTA', 'SEXTA'], turno: 'VESPERTINO', regiao: 'CENTRO' },
  { id: 'rsu-028', bairro: 'JARDIM IMPERIAL II', frequenciaTexto: 'SEGUNDA, QUARTA E SEXTA', diasSemana: ['SEGUNDA', 'QUARTA', 'SEXTA'], turno: 'VESPERTINO', regiao: 'CENTRO' },
  { id: 'rsu-029', bairro: 'RESIDENCIAL MARISE', frequenciaTexto: 'SEGUNDA, QUARTA E SEXTA', diasSemana: ['SEGUNDA', 'QUARTA', 'SEXTA'], turno: 'VESPERTINO', regiao: 'CENTRO' },
  { id: 'rsu-030', bairro: 'CIDADE JARDIM (CIDADE JADIM)', frequenciaTexto: 'QUARTA', diasSemana: ['QUARTA'], turno: 'VESPERTINO', regiao: 'CENTRO' },
  { id: 'rsu-031', bairro: 'JARDIM DECOLORES', frequenciaTexto: 'SEGUNDA, QUARTA E SEXTA', diasSemana: ['SEGUNDA', 'QUARTA', 'SEXTA'], turno: 'VESPERTINO', regiao: 'CENTRO' },
  { id: 'rsu-032', bairro: 'CONDOMINIO IMPERIAL', frequenciaTexto: 'SEGUNDA, QUARTA E SEXTA', diasSemana: ['SEGUNDA', 'QUARTA', 'SEXTA'], turno: 'VESPERTINO', regiao: 'CENTRO' },
  { id: 'rsu-033', bairro: 'RESIDENCIAL VIEIRA', frequenciaTexto: 'SEGUNDA, QUARTA E SEXTA', diasSemana: ['SEGUNDA', 'QUARTA', 'SEXTA'], turno: 'VESPERTINO', regiao: 'CENTRO' },
  { id: 'rsu-034', bairro: 'GARAVELO I, II', frequenciaTexto: 'SEGUNDA, QUARTA E SEXTA', diasSemana: ['SEGUNDA', 'QUARTA', 'SEXTA'], turno: 'VESPERTINO', regiao: 'CENTRO' },
  { id: 'rsu-035', bairro: 'SAMARAH', frequenciaTexto: 'SEGUNDA, QUARTA E SEXTA', diasSemana: ['SEGUNDA', 'QUARTA', 'SEXTA'], turno: 'VESPERTINO', regiao: 'CENTRO' },

  // 36 a 51: SEGUNDA E SEXTA / SEGUNDA / QUARTA E DOMINGO
  { id: 'rsu-036', bairro: 'SETOR SOLANGE PARK', frequenciaTexto: 'SEGUNDA E SEXTA', diasSemana: ['SEGUNDA', 'SEXTA'], turno: 'VESPERTINO', regiao: 'CENTRO' },
  { id: 'rsu-037', bairro: 'RESIDENCIAL NOVA CANAÃ (SETOR 1)', frequenciaTexto: 'SEGUNDA', diasSemana: ['SEGUNDA'], turno: 'VESPERTINO', regiao: 'CENTRO' },
  { id: 'rsu-038', bairro: 'CHACARA CRISTO REDENTOR', frequenciaTexto: 'SEGUNDA', diasSemana: ['SEGUNDA'], turno: 'MATUTINO', regiao: 'CENTRO' },
  { id: 'rsu-039', bairro: 'CEDRO', frequenciaTexto: 'QUARTA E DOMINGO', diasSemana: ['QUARTA', 'DOMINGO'], turno: 'VESPERTINO', regiao: 'CENTRO' },
  { id: 'rsu-040', bairro: 'BAYER', frequenciaTexto: 'QUARTA E DOMINGO', diasSemana: ['QUARTA', 'DOMINGO'], turno: 'VESPERTINO', regiao: 'CENTRO' },
  { id: 'rsu-041', bairro: 'ARCA PARK', frequenciaTexto: 'QUARTA E DOMINGO', diasSemana: ['QUARTA', 'DOMINGO'], turno: 'VESPERTINO', regiao: 'CENTRO' },
  { id: 'rsu-042', bairro: 'CONJUNTO CHACARA TERRA SANTA', frequenciaTexto: 'QUARTA E DOMINGO', diasSemana: ['QUARTA', 'DOMINGO'], turno: 'VESPERTINO', regiao: 'CENTRO' },
  { id: 'rsu-043', bairro: 'JARDIM IMPERIAL - NORTE RODOVIA', frequenciaTexto: 'SEGUNDA E SEXTA', diasSemana: ['SEGUNDA', 'SEXTA'], turno: 'VESPERTINO', regiao: 'CENTRO' },
  { id: 'rsu-044', bairro: 'RESIDENCIAL ROSA MORENA', frequenciaTexto: 'SEGUNDA E SEXTA', diasSemana: ['SEGUNDA', 'SEXTA'], turno: 'VESPERTINO', regiao: 'CENTRO' },
  { id: 'rsu-045', bairro: 'RESIDENCIAL NOVA CANAÃ (SETOR 2)', frequenciaTexto: 'SEGUNDA E SEXTA', diasSemana: ['SEGUNDA', 'SEXTA'], turno: 'VESPERTINO', regiao: 'CENTRO' },
  { id: 'rsu-046', bairro: 'SETOR LAGUNA PARK II', frequenciaTexto: 'SEGUNDA E SEXTA', diasSemana: ['SEGUNDA', 'SEXTA'], turno: 'VESPERTINO', regiao: 'CENTRO' },
  { id: 'rsu-047', bairro: 'RESIDENCIAL TERRA SANTA', frequenciaTexto: 'SEGUNDA E SEXTA', diasSemana: ['SEGUNDA', 'SEXTA'], turno: 'VESPERTINO', regiao: 'CENTRO' },
  { id: 'rsu-048', bairro: 'CHACARA DECOLORES', frequenciaTexto: 'SEGUNDA E SEXTA', diasSemana: ['SEGUNDA', 'SEXTA'], turno: 'VESPERTINO', regiao: 'CENTRO' },
  { id: 'rsu-049', bairro: 'SETOR BELA VISTA', frequenciaTexto: 'SEGUNDA E SEXTA', diasSemana: ['SEGUNDA', 'SEXTA'], turno: 'VESPERTINO', regiao: 'CENTRO' },
  { id: 'rsu-050', bairro: 'SETOR NOVA MORADA', frequenciaTexto: 'SEGUNDA E SEXTA', diasSemana: ['SEGUNDA', 'SEXTA'], turno: 'VESPERTINO', regiao: 'CENTRO' },
  { id: 'rsu-051', bairro: 'SETOR MARIAPOLIS', frequenciaTexto: 'SEGUNDA E SEXTA', diasSemana: ['SEGUNDA', 'SEXTA'], turno: 'VESPERTINO', regiao: 'CENTRO' },

  // 52 a 67: TERÇA, QUINTA E SABADO (CENTRO MATUTINO & VESPERTINO)
  { id: 'rsu-052', bairro: 'SETOR SERRA DOURADA', frequenciaTexto: 'TERÇA, QUINTA E SABADO', diasSemana: ['TERCA', 'QUINTA', 'SABADO'], turno: 'MATUTINO', regiao: 'CENTRO' },
  { id: 'rsu-053', bairro: 'SETOR CHACARA SANTA LUZIA', frequenciaTexto: 'TERÇA, QUINTA E SABADO', diasSemana: ['TERCA', 'QUINTA', 'SABADO'], turno: 'MATUTINO', regiao: 'CENTRO' },
  { id: 'rsu-054', bairro: 'RESIDENCIAL MELK', frequenciaTexto: 'TERÇA, QUINTA E SABADO', diasSemana: ['TERCA', 'QUINTA', 'SABADO'], turno: 'MATUTINO', regiao: 'CENTRO' },
  { id: 'rsu-055', bairro: 'SETOR MONTE SINAI', frequenciaTexto: 'TERÇA, QUINTA E SABADO', diasSemana: ['TERCA', 'QUINTA', 'SABADO'], turno: 'MATUTINO', regiao: 'CENTRO' },
  { id: 'rsu-056', bairro: 'VILA MARIA', frequenciaTexto: 'TERÇA, QUINTA E SABADO', diasSemana: ['TERCA', 'QUINTA', 'SABADO'], turno: 'MATUTINO', regiao: 'CENTRO' },
  { id: 'rsu-057', bairro: 'VILA EMANUEL', frequenciaTexto: 'TERÇA, QUINTA E SABADO', diasSemana: ['TERCA', 'QUINTA', 'SABADO'], turno: 'MATUTINO', regiao: 'CENTRO' },
  { id: 'rsu-058', bairro: 'SETOR RECANTO DO LAGO', frequenciaTexto: 'TERÇA, QUINTA E SABADO', diasSemana: ['TERCA', 'QUINTA', 'SABADO'], turno: 'VESPERTINO', regiao: 'CENTRO' },
  { id: 'rsu-059', bairro: 'SETOR LUZIA MONTEIRO', frequenciaTexto: 'TERÇA, QUINTA E SABADO', diasSemana: ['TERCA', 'QUINTA', 'SABADO'], turno: 'VESPERTINO', regiao: 'CENTRO' },
  { id: 'rsu-060', bairro: 'JARDIM PRIMAVERA', frequenciaTexto: 'TERÇA, QUINTA E SABADO', diasSemana: ['TERCA', 'QUINTA', 'SABADO'], turno: 'VESPERTINO', regiao: 'CENTRO' },
  { id: 'rsu-061', bairro: 'SETOR ARCO IRES', frequenciaTexto: 'TERÇA, QUINTA E SABADO', diasSemana: ['TERCA', 'QUINTA', 'SABADO'], turno: 'VESPERTINO', regiao: 'CENTRO' },
  { id: 'rsu-062', bairro: 'SETOR SOL DOURADO', frequenciaTexto: 'TERÇA, QUINTA E SABADO', diasSemana: ['TERCA', 'QUINTA', 'SABADO'], turno: 'VESPERTINO', regiao: 'CENTRO' },
  { id: 'rsu-063', bairro: 'SETOR SUL - PARTE BATALHÃO', frequenciaTexto: 'TERÇA, QUINTA E SABADO', diasSemana: ['TERCA', 'QUINTA', 'SABADO'], turno: 'VESPERTINO', regiao: 'CENTRO' },
  { id: 'rsu-064', bairro: 'SETOR TAMAREIRAS', frequenciaTexto: 'TERÇA, QUINTA E SABADO', diasSemana: ['TERCA', 'QUINTA', 'SABADO'], turno: 'VESPERTINO', regiao: 'CENTRO' },
  { id: 'rsu-065', bairro: 'SETOR CRISTINA II EXPANSÃO', frequenciaTexto: 'TERÇA, QUINTA E SABADO', diasSemana: ['TERCA', 'QUINTA', 'SABADO'], turno: 'VESPERTINO', regiao: 'CENTRO' },
  { id: 'rsu-066', bairro: 'VILA DOS SONHOS', frequenciaTexto: 'TERÇA, QUINTA E SABADO', diasSemana: ['TERCA', 'QUINTA', 'SABADO'], turno: 'VESPERTINO', regiao: 'CENTRO' },
  { id: 'rsu-067', bairro: 'SETOR GUARUJA PARK', frequenciaTexto: 'TERÇA, QUINTA E SABADO', diasSemana: ['TERCA', 'QUINTA', 'SABADO'], turno: 'VESPERTINO', regiao: 'CENTRO' },

  // 68 a 81: CENTRO (BAIXADA CASTORI, LAGUNA PARK, MORAES, TERÇA/SÁB, QUINTA, SEXTA)
  { id: 'rsu-068', bairro: 'JARDIM IMPERIAL - BAIXADA CASTORI', frequenciaTexto: 'SEGUNDA, QUARTA E SEXTA', diasSemana: ['SEGUNDA', 'QUARTA', 'SEXTA'], turno: 'VESPERTINO', regiao: 'CENTRO' },
  { id: 'rsu-069', bairro: 'SETOR VIDA NOVA', frequenciaTexto: 'TERÇA, QUINTA E SABADO', diasSemana: ['TERCA', 'QUINTA', 'SABADO'], turno: 'VESPERTINO', regiao: 'CENTRO' },
  { id: 'rsu-070', bairro: 'SETOR LAGUNA PARK', frequenciaTexto: 'TERÇA, QUINTA E SABADO', diasSemana: ['TERCA', 'QUINTA', 'SABADO'], turno: 'VESPERTINO', regiao: 'CENTRO' },
  { id: 'rsu-071', bairro: 'RESIDENCIAL CLEO PINHEIRO', frequenciaTexto: 'TERÇA, QUINTA E SABADO', diasSemana: ['TERCA', 'QUINTA', 'SABADO'], turno: 'VESPERTINO', regiao: 'CENTRO' },
  { id: 'rsu-072', bairro: 'RESIDENCIAL MORAES', frequenciaTexto: 'TERÇA, QUINTA E SABADO', diasSemana: ['TERCA', 'QUINTA', 'SABADO'], turno: 'VESPERTINO', regiao: 'CENTRO' },
  { id: 'rsu-073', bairro: 'SETOR ANA ROSA (PARTE BAIXA)', frequenciaTexto: 'TERÇA, QUINTA E SABADO', diasSemana: ['TERCA', 'QUINTA', 'SABADO'], turno: 'VESPERTINO', regiao: 'CENTRO' },
  { id: 'rsu-074', bairro: 'NOVO HORIZONTE', frequenciaTexto: 'TERÇA, QUINTA E SABADO', diasSemana: ['TERCA', 'QUINTA', 'SABADO'], turno: 'VESPERTINO', regiao: 'CENTRO' },
  { id: 'rsu-075', bairro: 'RESIDENCIAL MONTE CRISTO', frequenciaTexto: 'TERÇA, QUINTA E SABADO', diasSemana: ['TERCA', 'QUINTA', 'SABADO'], turno: 'VESPERTINO', regiao: 'CENTRO' },
  { id: 'rsu-076', bairro: 'SETOR MARIA EDUARDA', frequenciaTexto: 'TERÇA E SABADO', diasSemana: ['TERCA', 'SABADO'], turno: 'VESPERTINO', regiao: 'CENTRO' },
  { id: 'rsu-077', bairro: 'RESIDENCIAL RAIO DE SOL', frequenciaTexto: 'TERÇA E SABADO', diasSemana: ['TERCA', 'SABADO'], turno: 'VESPERTINO', regiao: 'CENTRO' },
  { id: 'rsu-078', bairro: 'SÃO SEBASTIÃO II', frequenciaTexto: 'QUINTA', diasSemana: ['QUINTA'], turno: 'VESPERTINO', regiao: 'CENTRO' },
  { id: 'rsu-079', bairro: 'ALTO DO CERRADO I E II', frequenciaTexto: 'QUINTA', diasSemana: ['QUINTA'], turno: 'VESPERTINO', regiao: 'CENTRO' },
  { id: 'rsu-080', bairro: 'RESIDENCIAL JOAREZ FREIRE', frequenciaTexto: 'QUINTA', diasSemana: ['QUINTA'], turno: 'VESPERTINO', regiao: 'CENTRO' },
  { id: 'rsu-081', bairro: 'RESIDENCIAL SANTA FÉ (MORRO)', frequenciaTexto: 'SEXTA', diasSemana: ['SEXTA'], turno: 'VESPERTINO', regiao: 'CENTRO' },

  // 82 a 96: REGIÃO LESTE (SEGUNDA, QUARTA E SEXTA)
  { id: 'rsu-082', bairro: 'SETOR PALMARES', frequenciaTexto: 'SEGUNDA, QUARTA E SEXTA', diasSemana: ['SEGUNDA', 'QUARTA', 'SEXTA'], turno: 'MATUTINO', regiao: 'LESTE' },
  { id: 'rsu-083', bairro: 'RESIDENCIAL ARAGUAIA', frequenciaTexto: 'SEGUNDA, QUARTA E SEXTA', diasSemana: ['SEGUNDA', 'QUARTA', 'SEXTA'], turno: 'MATUTINO', regiao: 'LESTE' },
  { id: 'rsu-084', bairro: 'SETOR BARCELOS', frequenciaTexto: 'SEGUNDA, QUARTA E SEXTA', diasSemana: ['SEGUNDA', 'QUARTA', 'SEXTA'], turno: 'MATUTINO', regiao: 'LESTE' },
  { id: 'rsu-085', bairro: 'JARDIM MARISTA', frequenciaTexto: 'SEGUNDA, QUARTA E SEXTA', diasSemana: ['SEGUNDA', 'QUARTA', 'SEXTA'], turno: 'MATUTINO', regiao: 'LESTE' },
  { id: 'rsu-086', bairro: 'SETOR PRIVE ELIAS', frequenciaTexto: 'SEGUNDA, QUARTA E SEXTA', diasSemana: ['SEGUNDA', 'QUARTA', 'SEXTA'], turno: 'MATUTINO', regiao: 'LESTE' },
  { id: 'rsu-087', bairro: 'SETOR MORADA DO BOSQUE', frequenciaTexto: 'SEGUNDA, QUARTA E SEXTA', diasSemana: ['SEGUNDA', 'QUARTA', 'SEXTA'], turno: 'MATUTINO', regiao: 'LESTE' },
  { id: 'rsu-088', bairro: 'SETOR PONTAKAYANA', frequenciaTexto: 'SEGUNDA, QUARTA E SEXTA', diasSemana: ['SEGUNDA', 'QUARTA', 'SEXTA'], turno: 'MATUTINO', regiao: 'LESTE' },
  { id: 'rsu-089', bairro: 'SETOR RIO VERMELHO', frequenciaTexto: 'SEGUNDA, QUARTA E SEXTA', diasSemana: ['SEGUNDA', 'QUARTA', 'SEXTA'], turno: 'VESPERTINO', regiao: 'LESTE' },
  { id: 'rsu-090', bairro: 'JARDIM DA LUZ', frequenciaTexto: 'SEGUNDA, QUARTA E SEXTA', diasSemana: ['SEGUNDA', 'QUARTA', 'SEXTA'], turno: 'VESPERTINO', regiao: 'LESTE' },
  { id: 'rsu-091', bairro: 'SETOR RENATA PARK', frequenciaTexto: 'SEGUNDA, QUARTA E SEXTA', diasSemana: ['SEGUNDA', 'QUARTA', 'SEXTA'], turno: 'VESPERTINO', regiao: 'LESTE' },
  { id: 'rsu-092', bairro: 'JARDIM DAS OLIVEIRAS', frequenciaTexto: 'SEGUNDA, QUARTA E SEXTA', diasSemana: ['SEGUNDA', 'QUARTA', 'SEXTA'], turno: 'VESPERTINO', regiao: 'LESTE' },
  { id: 'rsu-093', bairro: 'MAYSA', frequenciaTexto: 'SEGUNDA, QUARTA E SEXTA', diasSemana: ['SEGUNDA', 'QUARTA', 'SEXTA'], turno: 'VESPERTINO', regiao: 'LESTE' },
  { id: 'rsu-094', bairro: 'RESIDENCIAL 14 BIS', frequenciaTexto: 'SEGUNDA, QUARTA E SEXTA', diasSemana: ['SEGUNDA', 'QUARTA', 'SEXTA'], turno: 'VESPERTINO', regiao: 'LESTE' },
  { id: 'rsu-095', bairro: 'MARIA MONTEIRO (POLO INDUSTRIAL)', frequenciaTexto: 'SEGUNDA, QUARTA E SEXTA', diasSemana: ['SEGUNDA', 'QUARTA', 'SEXTA'], turno: 'MATUTINO', regiao: 'LESTE' },
  { id: 'rsu-096', bairro: 'RESIDENCIAL MARIA MONTEIRO', frequenciaTexto: 'QUARTA', diasSemana: ['QUARTA'], turno: 'MATUTINO', regiao: 'LESTE' },

  // 97 a 111: REGIÃO LESTE (SEGUNDA/QUA, TERÇA/SEX, TER/QUI/SÁB)
  { id: 'rsu-097', bairro: 'SÃO FRANCISCO II', frequenciaTexto: 'SEGUNDA E QUARTA', diasSemana: ['SEGUNDA', 'QUARTA'], turno: 'MATUTINO', regiao: 'LESTE' },
  { id: 'rsu-098', bairro: 'MAYSA CASCALHEIRA', frequenciaTexto: 'TERÇA E SEXTA', diasSemana: ['TERCA', 'SEXTA'], turno: 'VESPERTINO', regiao: 'LESTE' },
  { id: 'rsu-099', bairro: 'JARDIM SCALA', frequenciaTexto: 'TERÇA, QUINTA E SABADO', diasSemana: ['TERCA', 'QUINTA', 'SABADO'], turno: 'MATUTINO', regiao: 'LESTE' },
  { id: 'rsu-100', bairro: 'SETOR DOS BANDEIRANTES', frequenciaTexto: 'TERÇA, QUINTA E SABADO', diasSemana: ['TERCA', 'QUINTA', 'SABADO'], turno: 'MATUTINO', regiao: 'LESTE' },
  { id: 'rsu-101', bairro: 'ESTANCIA AROEIRA', frequenciaTexto: 'TERÇA, QUINTA E SABADO', diasSemana: ['TERCA', 'QUINTA', 'SABADO'], turno: 'MATUTINO', regiao: 'LESTE' },
  { id: 'rsu-102', bairro: 'PAINEIRAS', frequenciaTexto: 'TERÇA, QUINTA E SABADO', diasSemana: ['TERCA', 'QUINTA', 'SABADO'], turno: 'MATUTINO', regiao: 'LESTE' },
  { id: 'rsu-103', bairro: 'MAYSA II', frequenciaTexto: 'TERÇA, QUINTA E SABADO', diasSemana: ['TERCA', 'QUINTA', 'SABADO'], turno: 'MATUTINO', regiao: 'LESTE' },
  { id: 'rsu-104', bairro: 'CONJUNTO DONA IRES', frequenciaTexto: 'TERÇA, QUINTA E SABADO', diasSemana: ['TERCA', 'QUINTA', 'SABADO'], turno: 'MATUTINO', regiao: 'LESTE' },
  { id: 'rsu-105', bairro: 'MAYSA III', frequenciaTexto: 'TERÇA, QUINTA E SABADO', diasSemana: ['TERCA', 'QUINTA', 'SABADO'], turno: 'MATUTINO', regiao: 'LESTE' },
  { id: 'rsu-106', bairro: 'JARDIM IPANEMA', frequenciaTexto: 'TERÇA, QUINTA E SABADO', diasSemana: ['TERCA', 'QUINTA', 'SABADO'], turno: 'MATUTINO', regiao: 'LESTE' },
  { id: 'rsu-107', bairro: 'SETOR DONA IRES II', frequenciaTexto: 'TERÇA, QUINTA E SABADO', diasSemana: ['TERCA', 'QUINTA', 'SABADO'], turno: 'MATUTINO', regiao: 'LESTE' },
  { id: 'rsu-108', bairro: 'SETOR CRISTINA', frequenciaTexto: 'TERÇA, QUINTA E SABADO', diasSemana: ['TERCA', 'QUINTA', 'SABADO'], turno: 'MATUTINO', regiao: 'LESTE' },
  { id: 'rsu-109', bairro: 'RESIDENCIAL SOARES', frequenciaTexto: 'TERÇA, QUINTA E SABADO', diasSemana: ['TERCA', 'QUINTA', 'SABADO'], turno: 'MATUTINO', regiao: 'LESTE' },
  { id: 'rsu-110', bairro: 'RESIDENCIAL SOLAR EMBAUBA', frequenciaTexto: 'TERÇA, QUINTA E SABADO', diasSemana: ['TERCA', 'QUINTA', 'SABADO'], turno: 'MATUTINO', regiao: 'LESTE' },
  { id: 'rsu-111', bairro: 'JARDIM FLORESTA', frequenciaTexto: 'TERÇA, QUINTA E SABADO', diasSemana: ['TERCA', 'QUINTA', 'SABADO'], turno: 'VESPERTINO', regiao: 'LESTE' },

  // 112 a 117: LESTE & FECHAMENTO (HARMONIA, SERRA BRANCA, LOTEAMENTO SCALA, CALIFORNIA, SÃO BERNARDO II, CHACARA SANTA LUZIA)
  { id: 'rsu-112', bairro: 'SETOR HARMONIA', frequenciaTexto: 'QUINTA', diasSemana: ['QUINTA'], turno: 'MATUTINO', regiao: 'LESTE' },
  { id: 'rsu-113', bairro: 'SERRA BRANCA', frequenciaTexto: 'QUINTA', diasSemana: ['QUINTA'], turno: 'MATUTINO', regiao: 'LESTE' },
  { id: 'rsu-114', bairro: 'LOTEAMENTO SCALA', frequenciaTexto: 'TERÇA, QUINTA', diasSemana: ['TERCA', 'QUINTA'], turno: 'MATUTINO', regiao: 'LESTE' },
  { id: 'rsu-115', bairro: 'SETOR CALIFORNIA', frequenciaTexto: 'TERÇA E SABADO', diasSemana: ['TERCA', 'SABADO'], turno: 'MATUTINO', regiao: 'LESTE' },
  { id: 'rsu-116', bairro: 'SÃO BERNADO II (SÃO BERNARDO II)', frequenciaTexto: 'SEGUNDA, QUARTA E SEXTA', diasSemana: ['SEGUNDA', 'QUARTA', 'SEXTA'], turno: 'MATUTINO', regiao: 'LESTE' },
  { id: 'rsu-117', bairro: 'CHACARA SANTA LUZIA (PARTE TERRA)', frequenciaTexto: 'QUARTA', diasSemana: ['QUARTA'], turno: 'MATUTINO', regiao: 'CENTRO' },
];

export interface StatusColetaHoje {
  temColetaHoje: boolean;
  turno: TurnoColeta;
  horarioInstrucao: string;
  proximaColeta: {
    diaSemana: DiaSemana;
    diaSemanaExtenso: string;
    diasFaltando: number;
    turno: TurnoColeta;
    dataEstimada: string;
  };
}

/**
 * Busca o registro de coleta por nome de bairro (com tolerância a acentos e termos parciais)
 */
export function getCronogramaPorBairro(nomeOuTermo: string): ItemCronogramaRSU | undefined {
  if (!nomeOuTermo) return undefined;
  const termo = normalizarTexto(nomeOuTermo);

  // Busca exata primeiro
  const exato = CRONOGRAMA_OFICIAL_TRINDADE.find((item) => normalizarTexto(item.bairro) === termo);
  if (exato) return exato;

  // Busca por contenção
  return CRONOGRAMA_OFICIAL_TRINDADE.find(
    (item) => normalizarTexto(item.bairro).includes(termo) || termo.includes(normalizarTexto(item.bairro))
  );
}

function normalizarTexto(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Retorna horários recomendados para cada turno conforme prática municipal
 */
export function getHorarioTurno(turno: TurnoColeta): { inicio: string; instrucao: string; faixa: string } {
  if (turno === 'MATUTINO') {
    return {
      inicio: '07:00',
      faixa: '07:00 às 15:00',
      instrucao: 'Disponibilize a lixeira até as 06h45 da manhã.',
    };
  }
  return {
    inicio: '16:00 / 18:00',
    faixa: '16:00 às 22:00',
    instrucao: 'Disponibilize a lixeira a partir das 15h30 / 16h00 (vespertino/noturno).',
  };
}

/**
 * Calcula se hoje tem coleta para um bairro e calcula a data da próxima coleta
 */
export function getStatusColetaBairro(item: ItemCronogramaRSU, dataReferencia: Date = new Date()): StatusColetaHoje {
  const diaNumHoje = dataReferencia.getDay(); // 0 (Domingo) a 6 (Sábado)
  const diaHoje = DIAS_SEMANA_MAP[diaNumHoje];

  const temColetaHoje = item.diasSemana.includes(diaHoje);

  let diasAteProxima = 0;
  let proximoDiaSemana: DiaSemana = diaHoje;

  if (!temColetaHoje) {
    for (let i = 1; i <= 7; i++) {
      const checkDiaNum = (diaNumHoje + i) % 7;
      const checkDia = DIAS_SEMANA_MAP[checkDiaNum];
      if (item.diasSemana.includes(checkDia)) {
        diasAteProxima = i;
        proximoDiaSemana = checkDia;
        break;
      }
    }
  }

  const dataProxima = new Date(dataReferencia);
  dataProxima.setDate(dataReferencia.getDate() + diasAteProxima);

  const dataFormatada = dataProxima.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });

  const proximaColeta = {
    diaSemana: proximoDiaSemana,
    diaSemanaExtenso:
      diasAteProxima === 0
        ? 'Hoje'
        : diasAteProxima === 1
        ? 'Amanhã'
        : DIAS_SEMANA_LABELS[proximoDiaSemana].longo,
    diasFaltando: diasAteProxima,
    turno: item.turno,
    dataEstimada: dataFormatada,
  };

  const infoTurno = getHorarioTurno(item.turno);

  return {
    temColetaHoje,
    turno: item.turno,
    horarioInstrucao: infoTurno.instrucao,
    proximaColeta,
  };
}

/**
 * Resumo de todos os bairros com coleta agendada para o dia de hoje
 */
export function getBairrosHoje(dataReferencia: Date = new Date()) {
  const diaNum = dataReferencia.getDay();
  const diaSemana = DIAS_SEMANA_MAP[diaNum];

  const bairrosHoje = CRONOGRAMA_OFICIAL_TRINDADE.filter((item) => item.diasSemana.includes(diaSemana));
  const matutino = bairrosHoje.filter((item) => item.turno === 'MATUTINO');
  const vespertino = bairrosHoje.filter((item) => item.turno === 'VESPERTINO');

  return {
    diaSemana,
    diaSemanaLabel: DIAS_SEMANA_LABELS[diaSemana].longo,
    totalHoje: bairrosHoje.length,
    matutino,
    vespertino,
  };
}

/**
 * Dicas oficiais para o cidadão no manejo e descarte de RSU em Trindade
 */
export const DIRETRIZES_DESCARTE_TRINDADE = [
  {
    titulo: 'Horário Correto de Descarte',
    descricao:
      'Coloque o lixo na calçada ou lixeira até 1 hora antes do início do seu turno (até as 06h45 no Matutino ou até as 15h30 no Vespertino) para evitar que animais rasguem os sacos.',
    icone: '⏰',
  },
  {
    titulo: 'Proteja os Garis com Vidros e Perfurocortantes',
    descricao:
      'Cacos de vidro, pregos e lâmpadas devem ser colocados dentro de uma garrafa PET cortada ou envolvidos em jornal e papelão grosso antes do descarte.',
    icone: '🧴',
  },
  {
    titulo: 'Separar o Lixo Seco (Reciclável)',
    descricao:
      'Separe papéis limpos, papelão, plásticos e latinhas em sacos limpos e separados para facilitar o reaproveitamento e reciclagem.',
    icone: '♻️',
  },
  {
    titulo: 'Galhadas, Entulhos e Podas',
    descricao:
      'Não misture entulho de construção civil ou galhadas com o lixo doméstico. Para grandes volumes, utilize o serviço municipal pelo portal Zelo Urbano.',
    icone: '🌿',
  },
];
