import type { FastifyInstance } from 'fastify'
import { metaApiService } from '../services/metaApi.js'
import { decrypt } from '../services/crypto.js'
import { buildCacheKey, getFromCache, setInCache } from '../services/cache.js'
import type { Ad } from '@adspro/types'

interface AdsQuery { accountId: string; adsetId?: string; from: string; to: string }

export async function adsRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: AdsQuery }>(
    '/',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { accountId, adsetId, from, to } = request.query

      if (!accountId || !from || !to) {
        return reply.status(400).send({ error: 'accountId, from e to são obrigatórios' })
      }

      const account = await app.prisma.adAccount.findFirst({
        where: { id: accountId, userId: request.userId, isActive: true },
      })
      if (!account) return reply.status(403).send({ error: 'Conta não encontrada ou acesso negado' })

      const entityId = adsetId || 'all'
      const cacheKey = buildCacheKey({ accountId, level: 'ad', entityId, from, to })
      const cached = await getFromCache<Ad[]>(cacheKey, app.prisma, accountId, 'ad', entityId, from, to)
      if (cached) return reply.send({ data: cached, cached: true })

      const accessToken = decrypt(account.metaAccessToken)
      const ads = await metaApiService.getAds(accessToken, account.metaAccountId, from, to, adsetId)

      await setInCache(cacheKey, ads, app.prisma, accountId, 'ad', entityId, from, to, 3600)
      return reply.send({ data: ads, cached: false })
    }
  )
}
