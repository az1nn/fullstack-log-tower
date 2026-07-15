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
