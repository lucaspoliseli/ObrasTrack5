# Modelagem do banco (produção)

## Visão geral

- **users**: usuários (engenheiro, proprietário, admin). Autenticação via JWT; senha em bcrypt.
- **obras**: obras com endereço normalizado e etapas em JSONB.
- **mensagens**: chat por obra (FK obra_id, autor_id).
- **fotos**: metadados de fotos; arquivo em disco ou storage (FK obra_id, autor_id).

## Decisões de modelagem

### Endereço: colunas normalizadas

O endereço da obra é armazenado em **colunas** na tabela `obras`:

- `endereco_cep`, `endereco_logradouro`, `endereco_numero`, `endereco_bairro`, `endereco_cidade`, `endereco_uf`, `endereco_complemento`

**Motivo:** validação no banco, índices (ex.: busca por cidade), relatórios e integridade. A API monta o objeto `endereco` (cep, rua, numero, …) na resposta para o frontend.

### Etapas: JSONB

As etapas da obra permanecem em **JSONB** (`obras.etapas`), como array.

**Motivo:** o fluxo atual do frontend edita e salva a lista inteira de etapas (e subetapas) em uma única tela; não há consultas por etapa (ex.: “todas as etapas atrasadas”). Tabelas normalizadas (etapas, subetapas) exigiriam mais endpoints e mudança de UX. Com JSONB:

- CHECK garante que o valor é um array.
- Estrutura esperada (validada na aplicação):  
  `[{ nome, descricao, prazo, dataInicio, dataFim, status, subetapas: [{ id, nome, status }] }]`.

Se no futuro houver relatórios por etapa ou consultas complexas, pode-se criar tabelas `etapas` / `subetapas` e migrar.

### Integridade referencial

- **users:** sem FKs externas.
- **obras:** `proprietario_id`, `created_by_id`, `engenheiro_id` → `users(id)` com `ON DELETE SET NULL`.
- **mensagens:** `obra_id` → `obras(id)`, `autor_id` → `users(id)` com `ON DELETE CASCADE`.
- **fotos:** `obra_id` → `obras(id)`, `autor_id` → `users(id)` com `ON DELETE CASCADE`.

### Constraints

- **users:** `funcao` IN ('engenheiro','proprietario','admin'); formato de email (regex).
- **obras:** `status` não vazio e ≤ 80 chars; `progresso` entre 0 e 100; `etapas` tipo array.
- **fotos:** `tamanho` ≥ 0.

### Índices

- **users:** LOWER(email), funcao.
- **obras:** proprietario_id, engenheiro_id, created_by_id, LOWER(proprietario_email), LOWER(owner_email), criado_em DESC, LOWER(endereco_cidade).
- **mensagens:** obra_id, criado_em, (obra_id, criado_em) para listagem ordenada.
- **fotos:** obra_id, criado_em DESC.

### Nomes de colunas

Padrão **snake_case** no banco. A API expõe **camelCase** no JSON (ex.: `proprietarioId`, `dataInicio`).
