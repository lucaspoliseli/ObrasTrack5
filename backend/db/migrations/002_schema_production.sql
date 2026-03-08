-- =============================================================================
-- Migration 002: Schema preparado para produção
-- - Endereço normalizado (colunas em obras)
-- - Constraints e validações
-- - Etapas mantidas em JSONB com CHECK (modelo atual do frontend)
-- - Índices e integridade referencial
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. USERS: constraints e validações
-- -----------------------------------------------------------------------------
ALTER TABLE users
  ALTER COLUMN email SET NOT NULL,
  ALTER COLUMN senha_hash SET NOT NULL,
  ALTER COLUMN funcao SET NOT NULL,
  ALTER COLUMN funcao SET DEFAULT 'engenheiro';

ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_funcao;
ALTER TABLE users
  ADD CONSTRAINT chk_users_funcao
  CHECK (funcao IN ('engenheiro', 'proprietario', 'admin'));

ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_email_format;
ALTER TABLE users
  ADD CONSTRAINT chk_users_email_format
  CHECK (char_length(trim(email)) >= 3 AND email ~ '^[^@]+@[^@]+\.[^@]+$');

-- -----------------------------------------------------------------------------
-- 2. OBRAS: endereço normalizado (colunas)
-- -----------------------------------------------------------------------------
ALTER TABLE obras
  ADD COLUMN IF NOT EXISTS endereco_cep VARCHAR(20),
  ADD COLUMN IF NOT EXISTS endereco_logradouro VARCHAR(500),
  ADD COLUMN IF NOT EXISTS endereco_numero VARCHAR(20),
  ADD COLUMN IF NOT EXISTS endereco_bairro VARCHAR(200),
  ADD COLUMN IF NOT EXISTS endereco_cidade VARCHAR(200),
  ADD COLUMN IF NOT EXISTS endereco_uf CHAR(2),
  ADD COLUMN IF NOT EXISTS endereco_complemento VARCHAR(200);

-- Migrar dados do JSONB para as colunas e remover coluna endereco (só se ainda existir)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'obras' AND column_name = 'endereco'
  ) THEN
    UPDATE obras
    SET
      endereco_cep = NULLIF(trim(endereco->>'cep'), ''),
      endereco_logradouro = NULLIF(trim(endereco->>'rua'), ''),
      endereco_numero = NULLIF(trim(endereco->>'numero'), ''),
      endereco_bairro = NULLIF(trim(endereco->>'bairro'), ''),
      endereco_cidade = NULLIF(trim(endereco->>'cidade'), ''),
      endereco_uf = NULLIF(trim(upper(endereco->>'uf')), ''),
      endereco_complemento = NULLIF(trim(endereco->>'complemento'), '')
    WHERE jsonb_typeof(endereco) = 'object' AND endereco IS NOT NULL;
    ALTER TABLE obras DROP COLUMN endereco;
  END IF;
END $$;

-- Status da obra: não vazio e tamanho limitado
ALTER TABLE obras DROP CONSTRAINT IF EXISTS chk_obras_status;
ALTER TABLE obras
  ADD CONSTRAINT chk_obras_status
  CHECK (status IS NULL OR (char_length(trim(status)) > 0 AND char_length(status) <= 80));

-- Progresso entre 0 e 100
ALTER TABLE obras DROP CONSTRAINT IF EXISTS chk_obras_progresso;
ALTER TABLE obras
  ADD CONSTRAINT chk_obras_progresso
  CHECK (progresso IS NULL OR (progresso >= 0 AND progresso <= 100));

-- Etapas: deve ser um array JSON (estrutura validada na aplicação)
ALTER TABLE obras DROP CONSTRAINT IF EXISTS chk_obras_etapas_array;
ALTER TABLE obras
  ADD CONSTRAINT chk_obras_etapas_array
  CHECK (jsonb_typeof(etapas) = 'array');

-- Data final não anterior à data de início (opcional, pode ser relaxado)
-- ALTER TABLE obras ADD CONSTRAINT chk_obras_datas CHECK (data_final IS NULL OR data_inicio IS NULL OR data_final >= data_inicio);

-- Índice para busca por cidade (relatórios/ filtros)
CREATE INDEX IF NOT EXISTS idx_obras_endereco_cidade ON obras(LOWER(endereco_cidade))
  WHERE endereco_cidade IS NOT NULL AND endereco_cidade != '';

-- -----------------------------------------------------------------------------
-- 3. MENSAGENS: integridade e índices
-- -----------------------------------------------------------------------------
-- Índice composto para listar mensagens de uma obra ordenadas por data (paginação)
CREATE INDEX IF NOT EXISTS idx_mensagens_obra_criado
  ON mensagens(obra_id, criado_em ASC);

-- -----------------------------------------------------------------------------
-- 4. FOTOS: constraints
-- -----------------------------------------------------------------------------
ALTER TABLE fotos DROP CONSTRAINT IF EXISTS chk_fotos_tamanho;
ALTER TABLE fotos
  ADD CONSTRAINT chk_fotos_tamanho
  CHECK (tamanho IS NULL OR tamanho >= 0);

-- -----------------------------------------------------------------------------
-- 5. Comentário de documentação: estrutura esperada de etapas (JSONB)
-- -----------------------------------------------------------------------------
COMMENT ON COLUMN obras.etapas IS 'Array de etapas. Cada item: { nome, descricao, prazo, dataInicio, dataFim, status, aguardandoMaterial?, responsavel?, subetapas: [{ id, nome, status }] }. Validado na aplicação.';
