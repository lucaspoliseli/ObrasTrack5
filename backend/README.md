# Backend Planeja Obra (PostgreSQL)

API REST em Node.js/Express com banco PostgreSQL, substituindo o uso direto do Firebase.

## Pré-requisitos

- Node.js 18+
- PostgreSQL 14+ (local ou remoto)

## Configuração

1. Crie o banco:
   ```bash
   createdb planeja_obra
   ```

2. Copie o arquivo de ambiente:
   ```bash
   cp .env.example .env
   ```

3. Edite `.env` com sua conexão e JWT_SECRET:
   ```
   DATABASE_URL=postgresql://usuario:senha@localhost:5432/planeja_obra
   JWT_SECRET=um_segredo_forte_aqui
   PORT=3001
   FRONTEND_URL=http://localhost:3000
   ```

4. Instale dependências e rode as migrações (em ordem: 001, 002):
   ```bash
   npm install
   npm run migrate
   ```
   A migration 002 normaliza endereço em colunas e adiciona constraints/índices para produção.

### Rodar migrations no banco de **produção**

Use a **mesma** `DATABASE_URL` que o backend em produção usa (Neon, Supabase, Railway, etc.):

```bash
cd backend
export DATABASE_URL="postgresql://usuario:senha@host:5432/banco?sslmode=require"
npm run migrate
```

No Windows (PowerShell):

```powershell
cd backend
$env:DATABASE_URL="postgresql://usuario:senha@host:5432/banco?sslmode=require"
npm run migrate
```

Ou crie um `.env` temporário na pasta `backend` com apenas `DATABASE_URL=<sua_url_de_producao>` e rode `npm run migrate`. O script usa a mesma variável que o servidor; confira que é o mesmo banco.

### Onde está a DATABASE_URL de produção?

O backend **não** é deployado pelo Vercel (o Vercel só publica o frontend React). A `DATABASE_URL` de produção é a que você configurou no serviço onde o **backend** está rodando:

| Onde o backend está | Onde pegar a DATABASE_URL |
|---------------------|---------------------------|
| **Railway** | Dashboard do projeto → Backend → Variables → `DATABASE_URL` (ou "Connect" do Postgres no Railway) |
| **Render** | Dashboard → Backend service → Environment → `DATABASE_URL`; ou criar um Postgres no Render e copiar "Internal Database URL" / "External Database URL" |
| **Fly.io** | `fly secrets list` ou Dashboard do app → Secrets → `DATABASE_URL` |
| **Neon / Supabase** (só o banco) | Painel do Neon/Supabase → Connection string (copiar a URL completa; Neon costuma pedir `?sslmode=require`) |

Se o backend ainda não foi deployado, crie primeiro um banco PostgreSQL em produção (Neon, Supabase, etc.), anote a URL de conexão e use-a abaixo. Depois configure essa mesma URL como variável de ambiente no serviço que hospeda o backend.

5. Inicie o servidor:
   ```bash
   npm start
   # ou em desenvolvimento com auto-reload:
   npm run dev
   ```

6. **(Opcional)** Dados de teste para validar o frontend:
   ```bash
   npm run seed
   ```
   Cria: 1 engenheiro (`engenheiro@teste.com` / `123456`), 1 proprietário (`proprietario@teste.com` / `123456`), 2 obras, mensagens em uma obra e 1 foto.

## Endpoints principais

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/auth/register` | Cadastro (nome, sobrenome, email, telefone, senha, funcao) |
| POST | `/api/auth/login` | Login (email, senha) → retorna `token` e `user` |
| GET | `/api/auth/me` | Dados do usuário logado (Header: `Authorization: Bearer <token>`) |
| GET | `/api/obras` | Lista todas as obras |
| GET | `/api/obras/usuario` | Obras do usuário logado |
| GET | `/api/obras/:id` | Uma obra |
| POST | `/api/obras` | Criar obra (engenheiro) |
| PUT | `/api/obras/:id` | Atualizar obra |
| DELETE | `/api/obras/:id` | Remover obra |
| GET | `/api/obras/:obraId/mensagens` | Mensagens do chat |
| POST | `/api/obras/:obraId/mensagens` | Enviar mensagem |
| GET | `/api/obras/:obraId/fotos` | Fotos da obra |
| POST | `/api/obras/:obraId/fotos` | Upload (multipart: `file`, `descricao`) |
| DELETE | `/api/obras/foto/:fotoId` | Deletar foto |
| GET | `/api/users/:id` | Usuário por ID |
| PUT | `/api/users/:id` | Atualizar perfil |

## Migração Firebase → PostgreSQL

- Os dados atuais estão no Firebase (Auth + Firestore + Storage). Para migrar:
  1. Exportar usuários do Firebase Auth (emails; senhas precisam ser redefinidas ou usar script de import com hash).
  2. Exportar coleções Firestore (users, obras, mensagens, fotos) e mapear para as tabelas PostgreSQL.
  3. Baixar arquivos do Storage e colocar em `uploads/` no backend, ajustando `file_path` na tabela `fotos`.
  4. No frontend, apontar para esta API (variável `REACT_APP_API_URL`) e usar o novo Auth (JWT) em vez do Firebase.
