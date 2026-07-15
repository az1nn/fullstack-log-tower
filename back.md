Excelente ideia, Leleco. Documentar o backend e passar esse contexto consolidado para os seus agentes vai agilizar muito o desenvolvimento.

Como sou um modelo de IA baseado em texto, não consigo gerar e exportar um arquivo .pdf diretamente para download. No entanto, estruturei abaixo todo o documento em formato Markdown consolidado. Você pode simplesmente copiar o bloco abaixo e colar em um conversor de Markdown para PDF (como o Dillinger, Grip, ou até mesmo visualizar no VS Code e usar a opção "Print to PDF").

Os seus agentes OpenCode lerão essa estrutura de arquivos perfeitamente.

Documentação do Backend - Plataforma de Análise de Logs
1. Visão Geral e Arquitetura
O backend foi desenvolvido para suportar alta volumetria de dados, focado em performance de ingestão e leitura rápida.

Stack: Node.js, TypeScript, Fastify (Framework HTTP).

Validação: Zod (Parse e validação estrita de rotas e filtros).

Banco de Dados: PostgreSQL.

ORM: Prisma (Tipagem segura, migrações e otimização de queries, incluindo SQL nativo para agregações massivas).

Ingestão: Uso de Streams (readline) e Batch Inserts para processar arquivos de log gigantescos sem estourar a memória (OOM).

2. Infraestrutura
docker-compose.yml
Responsável por subir o banco de dados PostgreSQL.

YAML
version: '3.8'

services:
  db:
    image: postgres:15
    container_name: log-analyzer-db
    environment:
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: adminpassword
      POSTGRES_DB: logsdb
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
3. Banco de Dados e Modelagem
prisma/schema.prisma
Estrutura da tabela de logs com índices otimizados para paginação e filtros.

Snippet de código
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum LogLevel {
  INFO
  WARN
  ERROR
  DEBUG
  FATAL
}

model Log {
  id        String   @id @default(uuid())
  timestamp DateTime
  level     LogLevel
  message   String
  service   String?
  createdAt DateTime @default(now())

  @@index([timestamp])
  @@index([level])
}
4. Código Fonte (Aplicação Fastify)
src/lib/prisma.ts
Instância singleton do cliente Prisma.

TypeScript
import { PrismaClient } from '@prisma/client'

export const prisma = new PrismaClient()
src/routes/upload.ts
Rota de upload multipart que processa o arquivo via stream e insere em lotes.

TypeScript
import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import readline from 'readline'
import { LogLevel } from '@prisma/client'

export async function uploadRoutes(app: FastifyInstance) {
  app.post('/api/logs/upload', async (request, reply) => {
    const data = await request.file()

    if (!data) {
      return reply.status(400).send({ error: 'Nenhum arquivo encontrado.' })
    }

    const rl = readline.createInterface({
      input: data.file,
      crlfDelay: Infinity,
    })

    const logsToInsert: any[] = []
    const BATCH_SIZE = 1000 
    const logPattern = /^\[(.*?)\]\s+\[(.*?)\]\s+(.*)$/

    for await (const line of rl) {
      const match = line.match(logPattern)

      if (match) {
        const [, dateString, levelStr, message] = match
        const timestamp = new Date(dateString)
        const level = mapLogLevel(levelStr)

        if (!isNaN(timestamp.getTime())) {
          logsToInsert.push({ timestamp, level, message })
        }
      }

      if (logsToInsert.length >= BATCH_SIZE) {
        await prisma.log.createMany({ data: logsToInsert })
        logsToInsert.length = 0 
      }
    }

    if (logsToInsert.length > 0) {
      await prisma.log.createMany({ data: logsToInsert })
    }

    return reply.status(201).send({ message: 'Arquivo processado e logs importados com sucesso!' })
  })
}

function mapLogLevel(level: string): LogLevel {
  const upperLevel = level.toUpperCase()
  const validLevels = ['INFO', 'WARN', 'ERROR', 'DEBUG', 'FATAL']
  
  if (validLevels.includes(upperLevel)) {
    return upperLevel as LogLevel
  }
  return 'INFO'
}
src/routes/get-logs.ts
Rota de listagem paginada com busca textual e filtros complexos validados pelo Zod.

TypeScript
import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { LogLevel } from '@prisma/client'

const getLogsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  perPage: z.coerce.number().min(1).max(100).default(20),
  level: z.nativeEnum(LogLevel).optional(),
  search: z.string().optional(),
  startDate: z.string().datetime().transform((val) => new Date(val)).optional(),
  endDate: z.string().datetime().transform((val) => new Date(val)).optional(),
})

export async function getLogsRoute(app: FastifyInstance) {
  app.get('/api/logs', async (request, reply) => {
    const { page, perPage, level, search, startDate, endDate } = getLogsQuerySchema.parse(request.query)

    const skip = (page - 1) * perPage
    const whereClause: any = {}

    if (level) whereClause.level = level
    
    if (search) {
      whereClause.message = {
        contains: search,
        mode: 'insensitive',
      }
    }

    if (startDate || endDate) {
      whereClause.timestamp = {}
      if (startDate) whereClause.timestamp.gte = startDate
      if (endDate) whereClause.timestamp.lte = endDate
    }

    const [logs, totalCount] = await Promise.all([
      prisma.log.findMany({
        where: whereClause,
        skip,
        take: perPage,
        orderBy: { timestamp: 'desc' },
      }),
      prisma.log.count({ where: whereClause }),
    ])

    const totalPages = Math.ceil(totalCount / perPage)

    return reply.status(200).send({
      data: logs,
      meta: {
        totalItems: totalCount,
        totalPages,
        currentPage: page,
        perPage,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    })
  })
}
src/routes/metrics.ts
Rota do Dashboard gerando totalizadores, distribuição de categorias e gráfico de tendência via Query SQL bruta otimizada.

TypeScript
import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'

const metricsQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})

export async function metricsRoute(app: FastifyInstance) {
  app.get('/api/metrics', async (request, reply) => {
    const { startDate, endDate } = metricsQuerySchema.parse(request.query)

    const defaultStartDate = new Date()
    defaultStartDate.setDate(defaultStartDate.getDate() - 30)

    const filterStartDate = startDate ? new Date(startDate) : defaultStartDate
    const filterEndDate = endDate ? new Date(endDate) : new Date()

    const totalLogs = await prisma.log.count({
      where: {
        timestamp: {
          gte: filterStartDate,
          lte: filterEndDate,
        },
      },
    })

    const logsByLevel = await prisma.log.groupBy({
      by: ['level'],
      _count: { _all: true },
      where: {
        timestamp: {
          gte: filterStartDate,
          lte: filterEndDate,
        },
      },
    })

    const distribution = logsByLevel.map((item) => ({
      level: item.level,
      count: item._count._all,
    }))

    const trends = await prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
      SELECT 
        DATE("timestamp") as "date", 
        COUNT(*)::bigint as "count"
      FROM "Log"
      WHERE "timestamp" >= ${filterStartDate} AND "timestamp" <= ${filterEndDate}
      GROUP BY DATE("timestamp")
      ORDER BY "date" ASC
    `

    const formattedTrends = trends.map((trend) => ({
      date: trend.date.toISOString().split('T')[0],
      count: Number(trend.count),
    }))

    return reply.status(200).send({
      summary: { total: totalLogs },
      distribution,
      trends: formattedTrends,
    })
  })
}
src/server.ts
Ponto de entrada da aplicação, configuração de middlewares e Error Handler global.

TypeScript
import fastify from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import { ZodError } from 'zod'
import { uploadRoutes } from './routes/upload'
import { getLogsRoute } from './routes/get-logs'
import { metricsRoute } from './routes/metrics'

const app = fastify({ logger: true })

app.register(cors, { origin: true })

app.register(multipart, {
  limits: { fileSize: 100 * 1024 * 1024 },
})

app.register(uploadRoutes)
app.register(getLogsRoute)
app.register(metricsRoute)

app.setErrorHandler((error, request, reply) => {
  if (error instanceof ZodError) {
    return reply.status(400).send({
      message: 'Falha na validação dos campos.',
      errors: error.flatten().fieldErrors,
    })
  }

  app.log.error(error)
  return reply.status(500).send({ message: 'Erro interno do servidor.' })
})

app.listen({ port: 3333, host: '0.0.0.0' }).then(() => {
  console.log('🚀 HTTP Server running on http://localhost:3333')
})