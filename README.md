# ResET

> Aplicativo desktop de comunicação em grupo moderno, leve e minimalista.

## Visão Geral

O **ResET** é construído como um monólito modular com foco absoluto em desempenho, simplicidade e facilidade de manutenção:

- **Desktop:** [Tauri 2](https://tauri.app/) + [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) + [Vite](https://vite.dev/)
- **Backend:** [Node.js](https://nodejs.org/) LTS + [Fastify v5](https://fastify.dev/) + [Zod](https://zod.dev/)
- **Banco de Dados:** [PostgreSQL 17](https://www.postgresql.org/) + [Kysely](https://kysely.dev/)
- **Gerenciamento:** npm Workspaces
- **Containers:** Docker Compose (`compose.yaml`)

---

## Estrutura do Monorepo

```text
reset/
├── apps/
│   ├── desktop/             # Aplicativo desktop Tauri 2 + React + Vite
│   │   ├── src/             # Frontend React + CSS Tokens ResET
│   │   └── src-tauri/       # Backend Rust nativo (Windows MSVC)
│   └── server/              # Backend Fastify
│       └── src/
│           ├── database/    # Kysely connection & migrations
│           ├── plugins/     # Plugins Fastify (health, live/ready)
│           ├── app.ts       # Fábrica Fastify
│           ├── config.ts    # Validação de variáveis de ambiente com Zod
│           └── server.ts    # Entry point com graceful shutdown
├── packages/
│   └── shared/              # Schemas Zod, tipos TypeScript e constantes
├── compose.yaml             # Definição dos containers PostgreSQL e servidor
├── vitest.config.ts         # Configuração de testes automatizados
└── package.json             # Scripts e workspaces monorepo
```

---

## Pré-requisitos

1. **Node.js:** `>= 22` (desenvolvido e testado em Node 26)
2. **Rust & Cargo:** `>= 1.90` (testado em Rust 1.99)
3. **Compilador C++ (Windows):** Visual Studio Build Tools (MSVC) + Windows 10/11 SDK
4. **WebView2 Runtime:** Incluído no Microsoft Edge Evergreen
5. **Docker Desktop:** Para execução do banco de dados PostgreSQL

---

## Como Instalar e Executar

### 1. Clonar e Instalar Dependências

```bash
git clone https://github.com/GabrielKrull/ResET.git C:\Projetos\ResET
cd C:\Projetos\ResET
npm install
```

### 2. Configurar Variáveis de Ambiente

Copie o arquivo de exemplo:

```bash
cp .env.example .env
```

### 3. Iniciar o Banco de Dados (Docker)

```bash
docker compose up -d postgres
```

### 4. Executar Migrations do Banco (Desenvolvimento)

```bash
npm run migrate --workspace=@reset/server
```

Configure `VITE_API_URL` em `apps/desktop/.env.development` para desenvolvimento
e `apps/desktop/.env.production` para builds de produção. Não há URL padrão.

### Deploy dos containers de produção

Configure `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` e
`COMPOSE_DATABASE_URL` no `.env` (copie `.env.example` e substitua os valores).
Inicie o banco, aplique migrations explicitamente e então inicie o servidor:

```bash
docker compose build server
docker compose up -d postgres
docker compose run --rm migration
docker compose up -d server
```

O servidor de produção não executa migrations durante a inicialização.

### 5. Iniciar o Servidor Backend (Modo Dev)

```bash
npm run dev:server
```

O servidor iniciará em `http://127.0.0.1:3000`:

- **Liveness:** `http://127.0.0.1:3000/health/live`
- **Readiness:** `http://127.0.0.1:3000/health/ready`
- **Status da API:** `http://127.0.0.1:3000/api/status`

### 6. Iniciar o Aplicativo Desktop (Modo Dev)

```bash
npm run dev:desktop
```

---

## Testes e Qualidade de Código

```bash
# Executar testes automatizados (Vitest)
npm test

# Teste de integração (exige PostgreSQL acessível em DATABASE_URL)
npm run test:integration

# Verificação estática de tipos (TypeScript)
npm run typecheck

# Verificação de lint (ESLint flat config)
npm run lint

# Formatação de código (Prettier)
npm run format:check
```

---

## Licença

Distribuído sob a licença MIT. Veja `LICENSE` para mais informações.
