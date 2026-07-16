import { FastifyInstance } from 'fastify'

export function registerRequestLogger(app: FastifyInstance) {
  app.addHook('onResponse', async (request, reply) => {
    const durationMs = reply.getResponseTime()
    reply.header('X-Request-Id', request.id)
    app.log.info({
      reqId: request.id,
      method: request.method,
      route: request.routeOptions.url ?? request.url,
      statusCode: reply.statusCode,
      durationMs: Math.round(durationMs),
      traceId: request.headers['traceparent'] ?? undefined,
    })
  })
}
