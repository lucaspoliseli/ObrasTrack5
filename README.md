# ObrasTrack

Sistema web para **gestão e acompanhamento de obras**, desenvolvido como projeto acadêmico.  
Permite que **engenheiros** cadastrem e administrem obras, definam etapas, registrem fotos de progresso e conversem com **proprietários** por meio de um chat integrado.

---

## 2. Descrição do sistema

O **ObrasTrack** é uma aplicação voltada para o gerenciamento de obras civis, com foco na comunicação clara entre engenheiro responsável e proprietário.  
O sistema centraliza informações como:

- dados da obra (endereço, responsável, proprietário);
- cronograma (datas de início e fim, prazo);
- etapas e subetapas da obra;
- registro fotográfico;
- histórico de mensagens entre as partes envolvidas.

A aplicação foi inicialmente construída sobre **Firebase** (Auth, Firestore, Storage) e evoluiu para uma arquitetura com **API REST em Node.js/Express** e **banco de dados PostgreSQL**, mantendo compatibilidade com o legado durante a migração.

---

## 3. Objetivo do sistema

- **Organizar o cadastro e o acompanhamento de obras** em um único painel.
- **Facilitar a comunicação** entre engenheiros e proprietários.
- **Dar visibilidade ao cronograma e ao progresso da obra**, por meio de etapas, gráficos e fotos.
- **Servir como base acadêmica** para estudo de arquitetura fullstack (React + Node + PostgreSQL + Firebase legado).

---

## 4. Perfis de usuário

### Engenheiro

- Cadastra novas obras.
- Define etapas e subetapas.
- Atualiza status, datas e progresso.
- Envia fotos da obra.
- Acessa o chat com o proprietário.
- Visualiza lista de todas as obras sob sua responsabilidade.

### Proprietário

- Acompanha detalhes da obra (datas, status, endereço, responsável).
- Visualiza etapas e cronograma.
- Acessa a galeria de fotos da obra.
- Utiliza o chat para se comunicar com o engenheiro.
- Pode ter múltiplas obras vinculadas ao seu usuário.

---

## 5. Funcionalidades principais

- **Autenticação de usuários**
  - Cadastro e login de engenheiros e proprietários.
  - Autorização por perfil (engenheiro x proprietário).
- **Gestão de obras**
  - Cadastro de obra com dados do proprietário, endereço e cronograma.
  - Edição dos dados da obra pelo engenheiro responsável.
  - Lista de obras do usuário logado.
- **Etapas e subetapas**
  - Cadastro e edição de etapas da obra (nome, descrição, datas, status, prazo).
  - Cadastro de subetapas vinculadas a cada etapa.
  - Cálculo de prazo e sinalização de atrasos.
- **Fotos da obra**
  - Upload de fotos vinculadas a uma obra específica.
  - Listagem das fotos em grade, com descrição, autor e data.
  - Exclusão de fotos pelo engenheiro.
- **Chat da obra**
  - Canal de mensagens entre engenheiro e proprietário.
  - Histórico de mensagens por obra.
- **Visualização e acompanhamento**
  - Tela de detalhes da obra com informações gerais, dados de proprietário/responsável, datas e endereço.
  - Gráficos simples de andamento (obras x etapas concluídas).
  - Diferenciação clara entre obras em andamento, atrasadas, concluídas etc.

---

## 6. Tecnologias utilizadas

### Frontend

- **React** (Create React App)
- **React Router DOM** – gerenciamento de rotas
- **Context API** (`AuthContext`) – autenticação e estado global do usuário
- **CSS** modularizado por página/componente

### Backend

- **Node.js** (18+)
- **Express** – API REST
- **JWT** – autenticação baseada em token (rotas protegidas)

### Banco de dados

- **PostgreSQL**
  - Tabelas principais: `users`, `obras`, `mensagens`, `fotos`
  - Migrations em SQL puro (`backend/db/migrations/*.sql`)

### Outros recursos

- **Firebase (legado / compatibilidade)**
  - Auth, Firestore, Storage – mantidos para suportar dados anteriores à migração.
- **Multer**
  - Upload de arquivos (fotos) no backend.
- **dotenv**
  - Gerenciamento de variáveis de ambiente.

---

## 7. Arquitetura do sistema

A arquitetura atual é composta por dois blocos principais:

1. **Frontend React**
   - SPA (Single Page Application) criada com Create React App.
   - Rotas privadas e públicas (login, cadastro, obras, detalhes, fotos, chat).
   - Comunicação com a API via `fetch` encapsulado em `src/api/client.js`.
   - Serviços (`src/services/*.js`) que abstraem o acesso a dados (API ou Firebase), escondendo detalhes de implementação do restante da aplicação.

2. **Backend Node.js/Express**
   - API REST em `backend/server.js`, com rotas em `backend/routes/`:
     - `/api/auth` – cadastro, login, dados do usuário logado.
     - `/api/obras` – CRUD de obras, listagem por usuário.
     - `/api/obras/:obraId/fotos` – upload e listagem de fotos.
     - `/api/obras/:obraId/mensagens` – envio e listagem de mensagens do chat.
     - `/api/users` – informações de usuários.
   - Acesso ao banco via módulo `pg` e `backend/config/database.js`.
   - Migrations SQL controladas por `backend/db/runMigrations.js`.

O sistema foi planejado para permitir a **migração gradual** do Firebase para PostgreSQL, mantendo os services com um `if (USE_API)` que seleciona o backend apropriado de acordo com variáveis de ambiente.

---

## 8. Como executar o projeto

### 8.1 Backend (API + PostgreSQL)

1. **Instalar dependências:**

```bash
cd backend
npm install
```

2. **Configurar o banco de dados PostgreSQL:**

Crie um banco, por exemplo:

```bash
createdb planeja_obra
```

3. **Configurar `.env` do backend:**

```bash
cp .env.example .env
```

Edite o arquivo `.env`:

```env
DATABASE_URL=postgresql://usuario:senha@localhost:5432/planeja_obra
JWT_SECRET=um_segredo_forte_aqui
PORT=3001
FRONTEND_URL=http://localhost:3000
UPLOAD_DIR=uploads
```

4. **Rodar migrations:**

```bash
npm run migrate
```

5. **(Opcional) Popular com dados de teste:**

```bash
npm run seed
```

6. **Iniciar o servidor backend:**

```bash
npm start
# ou em desenvolvimento (com reload automático):
npm run dev
```

A API estará disponível em `http://localhost:3001`.

---

### 8.2 Frontend (React)

1. **Instalar dependências:**

Na raiz do projeto:

```bash
npm install
```

2. **Configurar `.env` do frontend:**

Crie ou edite o arquivo `.env` na raiz do projeto:

```env
REACT_APP_USE_API=true
REACT_APP_API_URL=http://localhost:3001
```

> `REACT_APP_USE_API=true` força o frontend a usar a nova API em Node/Express + PostgreSQL.  
> Se estiver `false` ou ausente, o app tentará usar o Firebase legado.

3. **Iniciar o frontend:**

```bash
npm start
```

Abra `http://localhost:3000` no navegador.

---

## 9. Estrutura do projeto

Visão geral dos diretórios principais:

```text
PA-III-main/
├─ backend/
│  ├─ config/
│  │  └─ database.js          # Conexão com PostgreSQL
│  ├─ db/
│  │  ├─ migrations/          # Scripts SQL (001_initial, 002_schema_production)
│  │  ├─ runMigrations.js     # Executa migrations em ordem
│  │  └─ seedTestData.js      # Popula dados de teste (users, obras, mensagens, fotos)
│  ├─ middleware/
│  │  └─ auth.js              # JWT, requireAuth, requireEngenheiro
│  ├─ routes/
│  │  ├─ auth.js              # /api/auth (register, login, me)
│  │  ├─ obras.js             # /api/obras (CRUD, obras do usuário)
│  │  ├─ fotos.js             # /api/obras/:obraId/fotos
│  │  ├─ mensagens.js         # /api/obras/:obraId/mensagens
│  │  └─ users.js             # /api/users
│  ├─ services/
│  │  └─ obraService.js       # Lógica adicional de obras
│  └─ server.js               # Inicialização do servidor Express
│
├─ src/
│  ├─ api/
│  │  └─ client.js            # Wrapper de fetch (API_URL, token, erros)
│  ├─ AuthContext/
│  │  └─ AuthContext.js       # Contexto de autenticação (API/Firebase)
│  ├─ components/
│  │  ├─ Header/
│  │  ├─ Footer/
│  │  ├─ MenuHamburguer/
│  │  ├─ Formulario/
│  │  ├─ Titulos/
│  │  └─ ...
│  ├─ Pages/
│  │  ├─ Login/
│  │  ├─ CadastroUsuario/
│  │  ├─ ObrasCadastradas/
│  │  ├─ DetalhesObras/
│  │  ├─ CadastroObra/
│  │  ├─ CadastroEtapas/
│  │  ├─ FotosObra/
│  │  ├─ ChatObra/
│  │  ├─ Perfil/
│  │  └─ Home/
│  ├─ services/
│  │  ├─ obraService.js       # Obras (API/Firebase)
│  │  ├─ fotoService.js       # Fotos (API/Firebase)
│  │  ├─ chatService.js       # Chat (API/Firebase)
│  │  └─ userService.js       # Usuários (API/Firebase)
│  ├─ utils/
│  │  └─ dateUtils.js         # Funções auxiliares de datas
│  ├─ firebase.js             # Configuração Firebase (legado)
│  ├─ App.js                  # Rotas e layout principal
│  └─ index.js                # Bootstrap do React
│
└─ README.md                  # Este arquivo
```

---

## 10. Contexto acadêmico

Este projeto foi desenvolvido como parte da disciplina **PA III** (Projeto Aplicado) em um contexto acadêmico, com os seguintes objetivos:

- Praticar o desenvolvimento de uma aplicação **fullstack** completa.
- Evoluir de uma solução baseada em **Firebase** para uma arquitetura com **API REST e banco relacional (PostgreSQL)**.
- Explorar conceitos de:
  - autenticação e autorização com JWT;
  - organização de código em camadas (frontend, API, banco);
  - migração gradual de dados e compatibilidade entre tecnologias;
  - boas práticas de UX para acompanhamento de obras.

Apesar do contexto acadêmico, o **ObrasTrack** foi pensado para se aproximar de um sistema real de gestão de obras, com fluxos, telas e arquitetura que podem ser aproveitados em cenários profissionais ou como base para projetos futuros.
# ObrasTrack

Projeto de gestão de obras (PA III). Frontend em React; backend pode usar **Firebase** (padrão) ou **API REST com PostgreSQL**.

## Backend (PostgreSQL)

Foi implementado um backend em Node.js/Express com banco **PostgreSQL** para atender à melhoria solicitada pelos professores e à migração do Firebase para PostgreSQL.

- **Pasta:** `backend/`
- **Documentação:** [backend/README.md](backend/README.md)
- **Como usar:**
  1. Instalar PostgreSQL e criar o banco `planeja_obra`.
  2. Em `backend/`: copiar `.env.example` para `.env`, configurar `DATABASE_URL` e `JWT_SECRET`.
  3. Rodar `npm install`, `npm run migrate`, `npm start`.
  4. No frontend: criar `.env` com `REACT_APP_USE_API=true` e `REACT_APP_API_URL=http://localhost:3001`.
  5. Reiniciar o React (`npm start`). O app passará a usar login/cadastro e dados via API (PostgreSQL).

Enquanto `REACT_APP_USE_API` não estiver definido ou for `false`, o app continua usando **Firebase** (Auth, Firestore, Storage) como antes.

---

# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
