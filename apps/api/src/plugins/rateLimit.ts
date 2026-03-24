import fastifyPlugin from 'fastify-plugin'
import rateLimit from '@fastify/rate-limit'
import type { FastifyInstance } from 'fastify'

export const rateLimitPlugin = fastifyPlugin(async (app: FastifyInstance) => {
  await app.register(rateLimit, {
    global: true,
    max: 100,
    timeWindow: '1 minute',
    keyGenerator: (request) => {
      const userId = (request as { userId?: string }).userId
      return userId ? `user-${userId}` : request.ip
    },
    errorResponseBuilder: () => ({
      error: 'Muitas requisições. Tente novamente em alguns instantes.',
      code: 'RATE_LIMIT_EXCEEDED',
      statusCode: 429,
    }),
  })
})
