-- Planeja Obra - Schema inicial PostgreSQL
-- Execute: psql $DATABASE_URL -f db/migrations/001_initial.sql
-- Ou use: npm run migrate

-- Extensão para UUID (opcional, pode usar gen_random_uuid() no PG13+)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tabela de usuários (substitui Firebase Auth + users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  senha_hash VARCHAR(255) NOT NULL,
  nome VARCHAR(255) NOT NULL DEFAULT '',
  sobrenome VARCHAR(255) NOT NULL DEFAULT '',
  display_name VARCHAR(255) DEFAULT '',
  telefone VARCHAR(50) DEFAULT '',
  funcao VARCHAR(50) NOT NULL DEFAULT 'engenheiro',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_funcao ON users(funcao);

-- Tabela de obras
CREATE TABLE IF NOT EXISTS obras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(500) NOT NULL,
  proprietario_id UUID REFERENCES users(id) ON DELETE SET NULL,
  proprietario_email VARCHAR(255) DEFAULT '',
  owner_email VARCHAR(255) DEFAULT '',
  proprietario_nome VARCHAR(255) DEFAULT '',
  contato_proprietario VARCHAR(100) DEFAULT '',
  proprietario_pendente BOOLEAN DEFAULT true,
  created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  engenheiro_id UUID REFERENCES users(id) ON DELETE SET NULL,
  responsavel_nome VARCHAR(255) DEFAULT '',
  -- Endereço (JSON: cep, rua, bairro, cidade, numero, complemento)
  endereco JSONB DEFAULT '{}',
  data_inicio DATE,
  data_final DATE,
  prazo VARCHAR(100) DEFAULT '',
  dias_passados INTEGER DEFAULT 0,
  observacao TEXT DEFAULT '',
  status VARCHAR(50) DEFAULT 'Em andamento',
  etapa_atual VARCHAR(100) DEFAULT '',
  progresso NUMERIC(5,2) DEFAULT 0,
  -- Etapas como JSON (array de { nome, descricao, prazo, dataInicio, dataFim, status, subetapas[] })
  etapas JSONB DEFAULT '[]',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_obras_proprietario_id ON obras(proprietario_id);
CREATE INDEX IF NOT EXISTS idx_obras_engenheiro_id ON obras(engenheiro_id);
CREATE INDEX IF NOT EXISTS idx_obras_created_by ON obras(created_by_id);
CREATE INDEX IF NOT EXISTS idx_obras_proprietario_email ON obras(LOWER(proprietario_email));
CREATE INDEX IF NOT EXISTS idx_obras_owner_email ON obras(LOWER(owner_email));
CREATE INDEX IF NOT EXISTS idx_obras_criado_em ON obras(criado_em DESC);

-- Mensagens (chat por obra)
CREATE TABLE IF NOT EXISTS mensagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  autor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  autor_nome VARCHAR(255) NOT NULL DEFAULT 'Usuário',
  texto TEXT NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mensagens_obra_id ON mensagens(obra_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_criado_em ON mensagens(criado_em);

-- Fotos (metadados; arquivo em disco ou storage)
CREATE TABLE IF NOT EXISTS fotos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  autor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  autor_nome VARCHAR(255) DEFAULT 'Engenheiro',
  descricao TEXT DEFAULT '',
  file_name VARCHAR(500) NOT NULL,
  file_path VARCHAR(1000) NOT NULL,
  url VARCHAR(1000) DEFAULT '',
  tamanho INTEGER DEFAULT 0,
  tipo VARCHAR(100) DEFAULT '',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fotos_obra_id ON fotos(obra_id);
CREATE INDEX IF NOT EXISTS idx_fotos_criado_em ON fotos(criado_em DESC);

-- Trigger para atualizar atualizado_em
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_users_updated ON users;
CREATE TRIGGER trigger_users_updated
  BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

DROP TRIGGER IF EXISTS trigger_obras_updated ON obras;
CREATE TRIGGER trigger_obras_updated
  BEFORE UPDATE ON obras FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
