import type { FastifyInstance } from 'fastify'
import { invalidateMemoryCache } from '../services/cache.js'

export async function accountsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/', { preHandler: [app.authenticate] }, async (request, reply) => {
    const accounts = await app.prisma.adAccount.findMany({
      where: { userId: request.userId, isActive: true },
      select: {
        id: true,
        metaAccountId: true,
        accountName: true,
        currency: true,
        timezone: true,
        isActive: true,
        isPrincipal: true,
        connectedAt: true,
        lastSyncAt: true,
      },
      orderBy: { connectedAt: 'desc' },
    })
    return reply.send({ data: accounts })
  })

  app.delete<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { id } = request.params
      const account = await app.prisma.adAccount.findFirst({ where: { id, userId: request.userId } })

      if (!account) return reply.status(404).send({ error: 'Conta não encontrada' })

      await app.prisma.adAccount.delete({ where: { id } })
      invalidateMemoryCache(id)
      await app.prisma.cachedInsights.deleteMany({ where: { adAccountId: id } })

      return reply.send({ success: true })
    }
  )

  app.patch<{ Params: { id: string } }>(
    '/:id/principal',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { id } = request.params
      const account = await app.prisma.adAccount.findFirst({ where: { id, userId: request.userId } })
      if (!account) return reply.status(404).send({ error: 'Conta não encontrada' })

      await app.prisma.adAccount.updateMany({ where: { userId: request.userId }, data: { isPrincipal: false } })
      await app.prisma.adAccount.update({ where: { id }, data: { isPrincipal: true } })

      return reply.send({ success: true })
    }
  )

  app.post<{ Params: { accountId: string } }>(
    '/cache/invalidate/:accountId',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { accountId } = request.params
      const account = await app.prisma.adAccount.findFirst({ where: { id: accountId, userId: request.userId } })

      if (!account) return reply.status(403).send({ error: 'Acesso negado' })

      invalidateMemoryCache(accountId)
      await app.prisma.cachedInsights.deleteMany({ where: { adAccountId: accountId } })

      return reply.send({ success: true, message: 'Cache invalidado com sucesso' })
    }
  )
}
