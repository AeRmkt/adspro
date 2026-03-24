import type { FastifyInstance } from 'fastify'
import { metaApiService } from '../services/metaApi.js'
import { decrypt } from '../services/crypto.js'
import { buildCacheKey, getFromCache, setInCache } from '../services/cache.js'
import type { Campaign } from '@adspro/types'

interface CampaignsQuery { accountId: string; from: string; to: string }

export async function campaignsRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: CampaignsQuery }>(
    '/',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { accountId, from, to } = request.query

      if (!accountId || !from || !to) {
        return reply.status(400).send({ error: 'accountId, from e to são obrigatórios' })
      }

      const account = await app.prisma.adAccount.findFirst({
        where: { id: accountId, userId: request.userId, isActive: true },
      })
      if (!account) return reply.status(403).send({ error: 'Conta não encontrada ou acesso negado' })

      const cacheKey = buildCacheKey({ accountId, level: 'campaign', entityId: 'all', from, to })
      const cached = await getFromCache<Campaign[]>(cacheKey, app.prisma, accountId, 'campaign', 'all', from, to)
      if (cached) return reply.send({ data: cached, cached: true })

      const accessToken = decrypt(account.metaAccessToken)
      const campaigns = await metaApiService.getCampaigns(accessToken, account.metaAccountId, from, to)

      await setInCache(cacheKey, campaigns, app.prisma, accountId, 'campaign', 'all', from, to, 3600)
      await app.prisma.adAccount.update({ where: { id: accountId }, data: { lastSyncAt: new Date() } })

      return reply.send({ data: campaigns, cached: false })
    }
  )
}
