import type { FastifyInstance } from 'fastify'
import { metaApiService } from '../services/metaApi.js'
import { decrypt } from '../services/crypto.js'
import { buildCacheKey, getFromCache, setInCache } from '../services/cache.js'
import type { AdSet } from '@adspro/types'

interface AdSetsQuery { accountId: string; campaignId?: string; from: string; to: string }

export async function adSetsRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: AdSetsQuery }>(
    '/',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { accountId, campaignId, from, to } = request.query

      if (!accountId || !from || !to) {
        return reply.status(400).send({ error: 'accountId, from e to são obrigatórios' })
      }

      const account = await app.prisma.adAccount.findFirst({
        where: { id: accountId, userId: request.userId, isActive: true },
      })
      if (!account) return reply.status(403).send({ error: 'Conta não encontrada ou acesso negado' })

      const entityId = campaignId || 'all'
      const cacheKey = buildCacheKey({ accountId, level: 'adset', entityId, from, to })
      const cached = await getFromCache<AdSet[]>(cacheKey, app.prisma, accountId, 'adset', entityId, from, to)
      if (cached) return reply.send({ data: cached, cached: true })

      const accessToken = decrypt(account.metaAccessToken)
      const adsets = await metaApiService.getAdSets(accessToken, account.metaAccountId, from, to, campaignId)

      await setInCache(cacheKey, adsets, app.prisma, accountId, 'adset', entityId, from, to, 3600)
      return reply.send({ data: adsets, cached: false })
    }
  )
}
