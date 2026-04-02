import type { FastifyInstance } from 'fastify'
import { metaApiService } from '../services/metaApi.js'
import { decrypt } from '../services/crypto.js'

export async function businessManagersRoutes(app: FastifyInstance) {

  // GET /api/business-managers — lista BMs do usuário
  app.get('/', { preHandler: app.authenticate }, async (request, reply) => {
    const bms = await app.prisma.businessManager.findMany({
      where: { userId: request.userId },
      orderBy: { createdAt: 'desc' },
    })
    return reply.send(bms)
  })

  // POST /api/business-managers/sync — sincroniza BMs da Meta
  app.post('/sync', { preHandler: app.authenticate }, async (request, reply) => {
    const connection = await app.prisma.facebookConnection.findUnique({
      where: { userId: request.userId },
    })

    if (!connection || connection.tokenInvalid) {
      return reply.status(401).send({ error: 'Conta Meta não conectada ou token inválido' })
    }

    const accessToken = decrypt(connection.accessToken)
    const bms = await metaApiService.getBusinessManagers(accessToken)

    const upserted = await Promise.all(
      bms.map(bm =>
        app.prisma.businessManager.upsert({
          where: { userId_bmId: { userId: request.userId, bmId: bm.id } },
          update: { bmName: bm.name, syncedAt: new Date() },
          create: {
            userId: request.userId,
            bmId: bm.id,
            bmName: bm.name,
            syncedAt: new Date(),
          },
        })
      )
    )

    return reply.send({ synced: upserted.length, businessManagers: upserted })
  })

  // POST /api/business-managers/:bmId/sync-accounts — sincroniza contas de anúncio do BM
  app.post('/:bmId/sync-accounts', { preHandler: app.authenticate }, async (request, reply) => {
    const { bmId } = request.params as { bmId: string }

    const bm = await app.prisma.businessManager.findFirst({
      where: { userId: request.userId, bmId },
    })

    if (!bm) {
      return reply.status(404).send({ error: 'Business Manager não encontrado' })
    }

    const connection = await app.prisma.facebookConnection.findUnique({
      where: { userId: request.userId },
    })

    if (!connection || connection.tokenInvalid) {
      return reply.status(401).send({ error: 'Token Meta inválido' })
    }

    const accessToken = decrypt(connection.accessToken)
    const accounts = await metaApiService.getBMAdAccounts(accessToken, bmId)

    const upserted = await Promise.all(
      accounts.map(async account => {
        const metaAccountId = account.id.replace('act_', '')
        return app.prisma.adAccount.upsert({
          where: { userId_metaAccountId: { userId: request.userId, metaAccountId } },
          update: {
            accountName: account.name,
            accountStatus: account.account_status,
            currency: account.currency ?? 'BRL',
            timezone: account.timezone_name ?? 'America/Sao_Paulo',
            lastSyncAt: new Date(),
          },
          create: {
            userId: request.userId,
            metaAccountId,
            metaAccessToken: connection.accessToken,
            accountName: account.name,
            currency: account.currency ?? 'BRL',
            timezone: account.timezone_name ?? 'America/Sao_Paulo',
            accountStatus: account.account_status,
            source: 'oauth',
            connectedAt: new Date(),
          },
        })
      })
    )

    await app.prisma.businessManager.update({
      where: { id: bm.id },
      data: { syncedAt: new Date() },
    })

    return reply.send({ synced: upserted.length, accounts: upserted })
  })

  // DELETE /api/business-managers/:bmId — remove BM
  app.delete('/:bmId', { preHandler: app.authenticate }, async (request, reply) => {
    const { bmId } = request.params as { bmId: string }

    const bm = await app.prisma.businessManager.findFirst({
      where: { userId: request.userId, bmId },
    })

    if (!bm) {
      return reply.status(404).send({ error: 'Business Manager não encontrado' })
    }

    await app.prisma.businessManager.delete({ where: { id: bm.id } })
    return reply.send({ ok: true })
  })
}
