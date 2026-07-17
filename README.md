# Fullstack Log Tower

Plataforma de análise de logs com ingestão de arquivos de alto volume, armazenamento
em PostgreSQL (Prisma) e dashboard de visualização.

## Estrutura
- `src/` — Backend Fastify (TypeScript): rotas de upload, listagem e métricas.
- `frontend/` — SPA React (Vite + Tailwind): Dashboard, Explorar Logs e Importar.
- `prisma/` — Schema do banco e migrações.
- `docker-compose.yml` — PostgreSQL 15 para desenvolvimento local.
- `openspec/` — Especificações impulsionando o desenvolvimento orientado a agents.

## Pré-requisitos
- Node.js 18+
- Docker

## Backend
```bash
cp .env.example .env   # já existe .env com credenciais locais
docker compose up -d   # sobe o PostgreSQL
npm install
npx prisma migrate dev # cria as tabelas
npm run dev            # roda em http://localhost:3333
```

## Frontend
```bash
cd frontend
npm install
npm run dev            # roda em http://localhost:5173
```

## Formatos aceitos (upload)
Cada linha do arquivo `.txt`/`.log` deve seguir:
```
[YYYY-MM-DDTHH:mm:ssZ] [LEVEL] mensagem
```
Níveis: `INFO`, `WARN`, `ERROR`, `DEBUG`, `FATAL`.

---

# English / Quick start

Fullstack log-analysis platform: import log files, store & classify them in
PostgreSQL (Prisma), and explore them via a responsive React dashboard with
filters, search, pagination, and statistical charts.

## Run the whole stack with Docker (recommended)
Requires Docker. One command brings up PostgreSQL, the Fastify backend, and the
React frontend:
```bash
docker compose up --build
```
- Frontend: http://localhost:8080
- Backend API: http://localhost:3333/api
- The frontend container proxies `/api/*` to the backend, so you only need to
  open http://localhost:8080.

The backend runs `prisma migrate deploy` automatically on startup, so the
database is ready without extra steps.

## Local development (without Docker)
```bash
# terminal 1 — database
docker compose up -d db

# terminal 2 — backend
cp .env.example .env
npm install
npx prisma migrate dev
npm run dev            # http://localhost:3333

# terminal 3 — frontend
cd frontend
npm install
npm run dev            # http://localhost:5173
```

## Log format
Each line of a `.txt`/`.log` file must match:
```
[YYYY-MM-DDTHH:mm:ssZ] [LEVEL] message
```
Levels: `INFO`, `WARN`, `ERROR`, `DEBUG`, `FATAL`. Lines that don't match are
counted as skipped and not imported.

