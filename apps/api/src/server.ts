import 'dotenv/config'
import Fastify, { type FastifyRequest, type FastifyReply } from 'fastify'
import { corsPlugin } from './plugins/cors.js'
import { jwtPlugin } from './plugins/jwt.js'
import { rateLimitPlugin } from './plugins/rateLimit.js'
import { supabasePlugin } from './plugins/supabase.js'
import { authRoutes } from './routes/auth.js'
import { accountsRoutes } from './routes/accounts.js'
import { campaignsRoutes } from './routes/campaigns.js'
import { adSetsRoutes } from './routes/adsets.js'
import { adsRoutes } from './routes/ads.js'
import { insightsRoutes } from './routes/insights.js'
import { reportsRoutes } from './routes/reports.js'
import { metaRoutes } from './routes/meta.js'
import { startTokenRenewalJob } from './jobs/tokenRenewal.js'

declare module 'fastify' {
  interface FastifyRequest {
    userId: string
    supabaseUserId: string
  }
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

const app = Fastify({
  logger: {
    transport: process.env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  },
})

// Plugins
await app.register(corsPlugin)
await app.register(supabasePlugin)
await app.register(rateLimitPlugin)
await app.register(jwtPlugin)

// Health check (sem autenticação)
app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

// Rotas (prefixo /api)
await app.register(authRoutes, { prefix: '/api/auth' })
await app.register(accountsRoutes, { prefix: '/api/accounts' })
await app.register(campaignsRoutes, { prefix: '/api/campaigns' })
await app.register(adSetsRoutes, { prefix: '/api/adsets' })
await app.register(adsRoutes, { prefix: '/api/ads' })
await app.register(insightsRoutes, { prefix: '/api/insights' })
await app.register(reportsRoutes, { prefix: '/api/reports' })
await app.register(metaRoutes, { prefix: '/api/meta' })

// Start
const port = Number(process.env.PORT) || 3001
const host = '0.0.0.0'

try {
  await app.listen({ port, host })
  app.log.info(`AdsPro API rodando em http://localhost:${port}`)
  startTokenRenewalJob(app.prisma, app.log)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
