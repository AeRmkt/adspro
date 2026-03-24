import type { FastifyInstance } from 'fastify'
import { metaApiService } from '../services/metaApi.js'
import { decrypt } from '../services/crypto.js'
import { buildCacheKey, getFromCache, setInCache } from '../services/cache.js'
import type { MetricInsights, DailyInsight, CompareResult } from '@adspro/types'

function calcDelta(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 1 : 0
  return (current - previous) / Math.abs(previous)
}

interface DateQuery { accountId: string; from: string; to: string }
interface CompareQuery { accountId: string; from1: string; to1: string; from2: string; to2: string }

export async function insightsRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: DateQuery }>(
    '/metrics',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { accountId, from, to } = request.query
      if (!accountId || !from || !to) return reply.status(400).send({ error: 'accountId, from e to são obrigatórios' })

      const account = await app.prisma.adAccount.findFirst({ where: { id: accountId, userId: request.userId, isActive: true } })
      if (!account) return reply.status(403).send({ error: 'Conta não encontrada ou acesso negado' })

      const cacheKey = buildCacheKey({ accountId, level: 'metrics', entityId: 'agg', from, to })
      const cached = await getFromCache<MetricInsights>(cacheKey, app.prisma, accountId, 'metrics', 'agg', from, to)
      if (cached) return reply.send({ data: cached, cached: true })

      const accessToken = decrypt(account.metaAccessToken)
      const metrics = await metaApiService.getAggregatedMetrics(accessToken, account.metaAccountId, from, to)

      await setInCache(cacheKey, metrics, app.prisma, accountId, 'metrics', 'agg', from, to, 300)
      return reply.send({ data: metrics, cached: false })
    }
  )

  app.get<{ Querystring: DateQuery }>(
    '/daily',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { accountId, from, to } = request.query
      if (!accountId || !from || !to) return reply.status(400).send({ error: 'accountId, from e to são obrigatórios' })

      const account = await app.prisma.adAccount.findFirst({ where: { id: accountId, userId: request.userId, isActive: true } })
      if (!account) return reply.status(403).send({ error: 'Conta não encontrada ou acesso negado' })

      const cacheKey = buildCacheKey({ accountId, level: 'daily', entityId: 'series', from, to })
      const cached = await getFromCache<DailyInsight[]>(cacheKey, app.prisma, accountId, 'daily', 'series', from, to)
      if (cached) return reply.send({ data: cached, cached: true })

      const accessToken = decrypt(account.metaAccessToken)
      const daily = await metaApiService.getDailyInsights(accessToken, account.metaAccountId, from, to)

      await setInCache(cacheKey, daily, app.prisma, accountId, 'daily', 'series', from, to, 300)
      return reply.send({ data: daily, cached: false })
    }
  )

  app.get<{ Querystring: CompareQuery }>(
    '/compare',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { accountId, from1, to1, from2, to2 } = request.query
      if (!accountId || !from1 || !to1 || !from2 || !to2) {
        return reply.status(400).send({ error: 'Todos os parâmetros de período são obrigatórios' })
      }

      const account = await app.prisma.adAccount.findFirst({ where: { id: accountId, userId: request.userId, isActive: true } })
      if (!account) return reply.status(403).send({ error: 'Conta não encontrada ou acesso negado' })

      const accessToken = decrypt(account.metaAccessToken)
      const [metrics1, metrics2] = await Promise.all([
        metaApiService.getAggregatedMetrics(accessToken, account.metaAccountId, from1, to1),
        metaApiService.getAggregatedMetrics(accessToken, account.metaAccountId, from2, to2),
      ])

      const deltas = {} as Record<keyof MetricInsights, number>
      for (const key of Object.keys(metrics1) as (keyof MetricInsights)[]) {
        const v1 = (metrics1[key] as number) || 0
        const v2 = (metrics2[key] as number) || 0
        deltas[key] = calcDelta(v1, v2)
      }

      const result: CompareResult = {
        period1: { from: from1, to: to1, metrics: metrics1 },
        period2: { from: from2, to: to2, metrics: metrics2 },
        deltas,
      }

      return reply.send({ data: result })
    }
  )
}
