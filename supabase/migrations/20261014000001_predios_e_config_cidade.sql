-- =====================================================================
-- Prédios públicos e configurações da cidade no banco
--
-- Antes, os prédios públicos e as configurações (telefones, horário,
-- aviso ao cidadão) ficavam salvos só no navegador de quem editou: outro
-- admin, ou outro aparelho, não via a mudança. E o mapa público usava uma
-- lista fixa no código. Agora tudo fica no banco.
--
-- Leitura: pública (o mapa do site mostra os prédios).
-- Gravação: só administradores.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.orgaos_publicos (
  id TEXT PRIMARY KEY CHECK (id ~ '^[a-z0-9-]{3,60}$'),
  nome TEXT NOT NULL CHECK (length(nome) BETWEEN 3 AND 200),
  tipo TEXT NOT NULL CHECK (tipo IN ('PREFEITURA','SECRETARIA','UBS','HOSPITAL_UPA','ESCOLA','CMEI','PARQUE','SERVICO','ECOPONTO')),
  latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -16.82 AND -16.48),
  longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -49.71 AND -49.37),
  endereco TEXT NOT NULL DEFAULT '',
  bairro TEXT NOT NULL DEFAULT '',
  telefone TEXT,
  horario TEXT,
  descricao TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trigger_orgaos_publicos_updated_at
  BEFORE UPDATE ON public.orgaos_publicos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.orgaos_publicos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orgaos_publicos_ler" ON public.orgaos_publicos
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "orgaos_publicos_admin_inserir" ON public.orgaos_publicos
  FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "orgaos_publicos_admin_alterar" ON public.orgaos_publicos
  FOR UPDATE TO authenticated USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "orgaos_publicos_admin_apagar" ON public.orgaos_publicos
  FOR DELETE TO authenticated USING ((SELECT public.is_admin()));

-- Configurações da cidade (telefones, horário, endereço, aviso ao cidadão)
-- na mesma linha única de portal_config. Vazio = usa o padrão do código.
ALTER TABLE public.portal_config
  ADD COLUMN IF NOT EXISTS cidade JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Os 29 prédios que estavam fixos no código (lib/public-places.ts)
INSERT INTO public.orgaos_publicos (id, nome, tipo, latitude, longitude, endereco, bairro, telefone, horario, descricao, ordem) VALUES
  ('pref-sede', 'Prefeitura Municipal de Trindade (Palácio das Rosas)', 'PREFEITURA', -16.655928, -49.488855, 'Rua Moisés Batista, Praça da Prefeitura', 'Vila Pai Eterno', '(62) 3506-7000', 'Seg a Sex: 08:00 às 17:00', 'Sede do Poder Executivo Municipal e gabinete do Prefeito.', 1),
  ('pref-trindade-2', 'Subprefeitura da Região Leste (Trindade II)', 'PREFEITURA', -16.633469, -49.397727, 'Rua das Araras, quadra 23', 'Jardim Floresta / Trindade II', '(62) 3506-7050', 'Seg a Sex: 08:00 às 17:00', 'Atendimento descentralizado da administração municipal para a Região Leste.', 2),
  ('camara-municipal', 'Câmara Municipal de Trindade', 'PREFEITURA', -16.6534, -49.4899, 'Praça Constantino Xavier, Centro', 'Centro', '(62) 3505-1234', 'Seg a Sex: 08:00 às 18:00', 'Palácio Vereador José Ferreira - Sede do Legislativo Municipal.', 3),
  ('sec-obras', 'Secretaria Municipal de Obras e Serviços Públicos', 'SECRETARIA', -16.6521, -49.4932, 'Av. Manoel Monteiro, esq. com Rua 10', 'Setor Central', '(62) 3506-7020', 'Seg a Sex: 07:00 às 17:00', 'Responsável por pavimentação, tapa-buracos, iluminação pública e infraestrutura.', 4),
  ('sec-saude', 'Secretaria Municipal de Saúde', 'SECRETARIA', -16.660148, -49.49641, 'Rua Padre Orlando de Moraes, nº 230', 'Vila Pai Eterno', '(62) 3506-7080', 'Seg a Sex: 07:30 às 17:00', 'Gestão da rede municipal de saúde, unidades básicas e vigilância sanitária.', 5),
  ('sec-educacao', 'Secretaria Municipal de Educação', 'SECRETARIA', -16.6542, -49.4908, 'Rua Rocha Lima, nº 115', 'Centro', '(62) 3506-7040', 'Seg a Sex: 08:00 às 17:00', 'Coordenação pedagógica e gestão das escolas e creches municipais.', 6),
  ('vapt-vupt', 'Vapt Vupt / Central do Cidadão Trindade', 'SERVICO', -16.6515, -49.4925, 'Galeria Trindade Shopping, Av. Manoel Monteiro', 'Centro', '(62) 3505-8900', 'Seg a Sex: 08:00 às 17:00', 'Emissão de documentos, tributos municipais e atendimento presencial.', 7),
  ('upa-tiradentes', 'UPA 24h Dilson Alberto de Souza', 'HOSPITAL_UPA', -16.636967, -49.41264, 'Avenida Tiradentes, s/n', 'Setor Cristina', '(62) 3506-7200', 'Atendimento ininterrupto 24 horas', 'Urgência e emergência médica clínica e pediátrica.', 8),
  ('hetrin-hospital', 'Hospital Estadual de Trindade (Hetrin)', 'HOSPITAL_UPA', -16.6482, -49.4851, 'Rua 3, nº 200', 'Vila Redenção', '(62) 3121-5400', 'Atendimento 24 horas', 'Atendimento hospitalar de média complexidade, cirurgias e maternidade.', 9),
  ('ubs-santuario', 'UBS Santuário Novo', 'UBS', -16.673424, -49.484132, 'Rua 135, quadra 42', 'Setor Santuário', '(62) 3506-7085', 'Seg a Sex: 07:00 às 17:00', 'Consultas médicas, vacinação, pré-natal e curativos.', 10),
  ('ubs-pai-eterno', 'UBS Vila Pai Eterno', 'UBS', -16.6575, -49.4872, 'Av. Raimundo de Aquino, nº 840', 'Vila Pai Eterno', '(62) 3506-7087', 'Seg a Sex: 07:00 às 17:00', 'Atendimento de saúde da família para a região do Santuário Matriz.', 11),
  ('ubs-centro', 'UBS Central (Dr. Waldir Graciano)', 'UBS', -16.6548, -49.4916, 'Rua do Comércio, nº 420', 'Centro', '(62) 3506-7090', 'Seg a Sex: 07:00 às 17:00', 'Estratégia Saúde da Família, vacinas e distribuição de medicamentos.', 12),
  ('ubs-maysa', 'UBS Setor Maysa I', 'UBS', -16.6398, -49.3921, 'Rua São Luiz, quadra 18', 'Setor Maysa I', '(62) 3506-7093', 'Seg a Sex: 07:00 às 17:00', 'Unidade de referência em atenção primária da Grande Região Leste.', 13),
  ('ubs-pontakayana', 'UBS Setor Pontakayana', 'UBS', -16.6625, -49.4628, 'Av. Pontakayana, quadra 10', 'Setor Pontakayana', '(62) 3506-7095', 'Seg a Sex: 07:00 às 17:00', 'Acolhimento da comunidade, vacinas e visitas comunitárias.', 14),
  ('cmei-leda-taveira', 'CMEI Professora Leda Taveira', 'CMEI', -16.6582, -49.4861, 'Rua São Sebastião, nº 180', 'Vila Pai Eterno', '(62) 3506-7110', 'Seg a Sex: 07:00 às 17:30', 'Centro Municipal de Educação Infantil para bebês e crianças de 0 a 5 anos.', 15),
  ('cmei-maria-pires', 'CMEI Maria Pires Perillo', 'CMEI', -16.6518, -49.4891, 'Rua 15 de Novembro, nº 95', 'Centro', '(62) 3506-7112', 'Seg a Sex: 07:00 às 17:30', 'Educação infantil em período integral e parcial.', 16),
  ('cmei-menino-jesus', 'CMEI Menino Jesus', 'CMEI', -16.6384, -49.3945, 'Rua Belo Horizonte, quadra 32', 'Setor Maysa II', '(62) 3506-7115', 'Seg a Sex: 07:00 às 17:30', 'Atendimento integral à primeira infância na Região Leste.', 17),
  ('cmei-santo-afonso', 'CMEI Santo Afonso', 'CMEI', -16.6642, -49.4831, 'Av. Santo Afonso, nº 310', 'Setor Santuário', '(62) 3506-7118', 'Seg a Sex: 07:00 às 17:30', 'Educação e desenvolvimento infantil municipal.', 18),
  ('esc-padre-renato', 'Escola Municipal Padre Renato', 'ESCOLA', -16.6565, -49.4849, 'Rua do Cruzeiro, nº 450', 'Vila Pai Eterno', '(62) 3506-7130', 'Seg a Sex: 07:00 às 17:30', 'Ensino Fundamental I e II com programas de robótica e reforço escolar.', 19),
  ('esc-cirandinha', 'Escola Municipal Cirandinha', 'ESCOLA', -16.6529, -49.4921, 'Rua Couto Magalhães, nº 220', 'Centro', '(62) 3506-7132', 'Seg a Sex: 07:00 às 17:30', 'Tradicional unidade municipal de alfabetização e anos iniciais.', 20),
  ('esc-alice-ferreira', 'Escola Municipal Professora Alice Ferreira do Carmo', 'ESCOLA', -16.6491, -49.4838, 'Rua 7, quadra 14', 'Vila Redenção', '(62) 3506-7135', 'Seg a Sex: 07:00 às 17:30', 'Ensino Fundamental com biblioteca comunitária e quadra poliesportiva.', 21),
  ('esc-wilmar-almeida', 'Escola Municipal Dr. Wilmar de Almeida', 'ESCOLA', -16.6425, -49.4752, 'Av. Salvador, quadra 11', 'Jardim Salvador', '(62) 3506-7138', 'Seg a Sex: 07:00 às 17:30', 'Educação integral e projetos de leitura.', 22),
  ('col-padre-anchieta', 'Colégio Municipal Padre José de Anchieta', 'ESCOLA', -16.743637, -49.6033, 'Rua Abel Domingues, s/n', 'Distrito de Santa Maria de Trindade', '(62) 3506-7140', 'Seg a Sex: 07:00 às 17:30', 'Atendimento educacional no distrito histórico de Santa Maria.', 23),
  ('parque-lara-guimaraes', 'Parque Municipal Lara Guimarães', 'PARQUE', -16.663836, -49.492197, 'Rua Cornélia Maria de Souza', 'Vila Pai Eterno', NULL, 'Aberto diariamente: 06:00 às 22:00', 'Principal parque urbano de Trindade com lago dos pedalinhos, pista de caminhada, academia ao ar livre e quiosques.', 24),
  ('parque-ecologico', 'Parque Ecológico Municipal de Trindade', 'PARQUE', -16.667281, -49.491136, 'Continuação da Av. Manoel Monteiro Sul', 'Setor Sul', NULL, 'Aberto todos os dias: 06:00 às 20:00', 'Bosque preservado com trilhas arborizadas e nascentes municipais.', 25),
  ('praca-prefeitura', 'Praça da Prefeitura Municipal', 'PARQUE', -16.655606, -49.489075, 'Em frente ao Palácio das Rosas', 'Vila Pai Eterno', NULL, 'Livre acesso 24 horas', 'Espaço cívico municipal arborizado, com bancos, iluminação LED e eventos públicos.', 26),
  ('praca-basilica', 'Praça do Santuário Basílica do Divino Pai Eterno', 'PARQUE', -16.660752, -49.485396, 'Avenida Doutor Irani Ferreira, s/n', 'Santuário', NULL, 'Livre acesso 24 horas', 'Grande esplanada de acolhimento de romeiros, eventos culturais e peregrinação.', 27),
  ('ginasio-armando-greco', 'Ginásio Municipal de Esportes Armando Greco', 'PARQUE', -16.6568, -49.4942, 'Rua Dr. Pedro Ludovico, nº 350', 'Centro', '(62) 3506-7150', 'Seg a Sáb: 07:00 às 22:00', 'Quadras poliesportivas para futebol de salão, vôlei, basquete e eventos da comunidade.', 28),
  ('praca-lazer-oeste', 'Praça Municipal do Lazer', 'PARQUE', -16.659895, -49.496577, 'Av. Raimundo de Aquino com Rua 14', 'Setor Oeste', NULL, 'Livre acesso', 'Playground infantil, quadra de areia e convivência comunitária.', 29)
ON CONFLICT (id) DO NOTHING;
