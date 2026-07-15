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
